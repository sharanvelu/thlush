import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema, type DbExecutor, type Transaction } from "@/db";
import { hasPermission } from "@/config/permissions";
import { businessDayKey } from "@/lib/dates";
import { isUniqueViolation } from "@/lib/db-errors";
import { HttpError } from "@/lib/errors";
import { D, parseMoney } from "@/lib/money";
import type { BillSaveInput } from "@/lib/validation/bill";
import * as AuditService from "@/services/AuditService";
import { planBill, type BillPlan, type PlanItem } from "@/services/bill-plan";
import * as CustomerService from "@/services/CustomerService";
import { getSettings } from "@/services/SettingsService";
import type { AppSettings } from "@/types/settings";
import type { BillDetail, HeldBillSummary } from "@/types/bill";
import type { SessionUser } from "@/types/user";

const { bills, billItems, payments, menuItems, categories, customers, users, stockMovements } = schema;

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** A bill visible to `user`: their own, or any bill for roles that can see all. */
function canSee(user: SessionUser, createdUserId: string | null): boolean {
  return hasPermission(user.role, "bills.view_all") || createdUserId === user.id;
}

export async function getBill(id: number, user: SessionUser, executor: DbExecutor = db): Promise<BillDetail> {
  const [row] = await executor
    .select({
      bill: bills,
      customer: { id: customers.id, name: customers.name, phone: customers.phone, email: customers.email },
      cashier: { id: users.id, name: users.name },
    })
    .from(bills)
    .leftJoin(customers, eq(customers.id, bills.customerId))
    .leftJoin(users, eq(users.id, bills.createdUserId))
    .where(eq(bills.id, id));
  // Someone else's bill is reported as missing rather than forbidden, so ids cannot be probed.
  if (!row || !canSee(user, row.bill.createdUserId)) throw HttpError.notFound("Bill not found.");

  const [items, paymentRows] = await Promise.all([
    executor.select().from(billItems).where(eq(billItems.billId, id)).orderBy(asc(billItems.id)),
    executor.select().from(payments).where(eq(payments.billId, id)).orderBy(asc(payments.id)),
  ]);

  const { bill } = row;
  return {
    id: bill.id,
    billNo: bill.billNo,
    status: bill.status,
    createdAt: bill.createdAt.toISOString(),
    currency: bill.currency,
    subtotal: bill.subtotal,
    totalDiscount: bill.totalDiscount,
    totalTax: bill.totalTax,
    totalAmount: bill.totalAmount,
    discountType: bill.discountType,
    discountValue: bill.discountValue,
    amountPaid: bill.amountPaid,
    changeDue: bill.changeDue,
    orderType: bill.orderType,
    tableNo: bill.tableNo,
    notes: bill.notes,
    voidReason: bill.voidReason,
    customer: row.customer?.id ? row.customer : null,
    cashier: row.cashier?.id ? row.cashier : null,
    items: items.map((i) => ({
      id: i.id,
      menuItemId: i.menuItemId,
      name: i.name,
      price: i.price,
      sgst: i.sgst,
      cgst: i.cgst,
      quantity: i.quantity,
      discount: i.discount,
      total: i.total,
      options: i.options,
    })),
    payments: paymentRows.map((p) => ({ id: p.id, method: p.method, amount: p.amount, reference: p.reference })),
  };
}

export async function listHeldBills(user: SessionUser): Promise<HeldBillSummary[]> {
  const ownOnly = hasPermission(user.role, "bills.view_all") ? undefined : eq(bills.createdUserId, user.id);
  const rows = await db
    .select({
      id: bills.id,
      createdAt: bills.createdAt,
      tableNo: bills.tableNo,
      total: bills.totalAmount,
      customerName: customers.name,
      itemCount: sql<number>`(select count(*) from ${billItems} where ${billItems.billId} = ${bills.id})`.mapWith(Number),
    })
    .from(bills)
    .leftJoin(customers, eq(customers.id, bills.customerId))
    .where(and(eq(bills.status, "held"), ownOnly))
    .orderBy(desc(bills.createdAt))
    .limit(50);
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    customerName: r.customerName,
    tableNo: r.tableNo,
    itemCount: r.itemCount,
    total: r.total,
  }));
}

export async function discardHeldBill(id: number, user: SessionUser): Promise<void> {
  await db.transaction(async (tx) => {
    const [bill] = await tx.select().from(bills).where(and(eq(bills.id, id), eq(bills.status, "held"))).for("update");
    if (!bill || !canSee(user, bill.createdUserId)) throw HttpError.notFound("Held bill not found.");
    await tx.delete(bills).where(eq(bills.id, id)); // Items cascade.
    await AuditService.record(
      { userId: user.id, action: "bill.discard_held", entity: "bill", entityId: id, metadata: { total: bill.totalAmount } },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

/** Next "{prefix}{YYYYMMDD}-{seq}" for the business day. Serialised per day, so numbers are unique and gap-free. */
async function nextBillNo(tx: Transaction, now: Date, settings: AppSettings): Promise<string> {
  const day = businessDayKey(now, settings.locale.timezone);
  const base = `${settings.billing.billPrefix}${day}-`;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${base}))`);
  const [last] = await tx
    .select({ billNo: bills.billNo })
    .from(bills)
    .where(sql`starts_with(${bills.billNo}, ${base})`)
    .orderBy(desc(sql`length(${bills.billNo})`), desc(bills.billNo))
    .limit(1);
  const lastSeq = last ? Number(last.billNo.slice(base.length)) : 0;
  const seq = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${base}${String(seq).padStart(settings.billing.sequencePadding, "0")}`;
}

async function loadPlanItems(tx: Transaction, ids: number[], lock: boolean): Promise<Map<number, PlanItem>> {
  const query = tx
    .select({
      id: menuItems.id,
      name: menuItems.name,
      price: menuItems.price,
      sgst: menuItems.sgst,
      cgst: menuItems.cgst,
      status: menuItems.status,
      categoryStatus: categories.status,
      deletedAt: menuItems.deletedAt,
      unit: menuItems.unit,
      trackStock: menuItems.trackStock,
      stockQty: menuItems.stockQty,
      variants: menuItems.variants,
      addons: menuItems.addons,
    })
    .from(menuItems)
    .innerJoin(categories, eq(categories.id, menuItems.categoryId))
    .where(inArray(menuItems.id, ids))
    .orderBy(asc(menuItems.id)); // Consistent lock order avoids deadlocks between concurrent sales.
  const rows = await (lock ? query.for("update", { of: menuItems }) : query);
  return new Map(rows.map((r) => [r.id, { ...r, deleted: r.deletedAt !== null } satisfies PlanItem]));
}

async function findByClientRef(clientRef: string) {
  const [row] = await db
    .select({ id: bills.id, createdUserId: bills.createdUserId })
    .from(bills)
    .where(eq(bills.clientRef, clientRef));
  return row ?? null;
}

/**
 * Saves a bill, or puts it on hold, in ONE transaction: customer, bill, lines,
 * payments, stock movements and the audit entry all commit together or not at all.
 *
 * Calling it again with the same `clientRef` returns the bill that save created,
 * so a double-click or a retry after a dropped connection never makes a second bill.
 */
export async function saveBill(input: BillSaveInput, user: SessionUser): Promise<BillDetail> {
  const replay = await findByClientRef(input.clientRef);
  if (replay) {
    if (replay.createdUserId !== user.id) throw HttpError.conflict("This save reference is already in use.");
    return getBill(replay.id, user);
  }

  const settings = await getSettings();

  try {
    const billId = await db.transaction(async (tx) => {
      const completing = input.action === "complete";
      const now = new Date();

      // A bill being finished from hold keeps its row but gets its real number now.
      let held: typeof bills.$inferSelect | undefined;
      if (input.heldBillId !== null) {
        [held] = await tx
          .select()
          .from(bills)
          .where(and(eq(bills.id, input.heldBillId), eq(bills.status, "held")))
          .for("update");
        if (!held || !canSee(user, held.createdUserId)) {
          throw HttpError.conflict("That held bill is no longer there. It may have been finished already.");
        }
      }

      const ids = [...new Set(input.lines.map((l) => l.menuItemId))];
      const items = await loadPlanItems(tx, ids, completing);
      const plan = planBill(input, items, {
        ignoreTax: settings.tax.ignoreTax,
        discountsEnabled: settings.features.discounts,
        orderTypesEnabled: settings.features.orderTypes,
        blockOutOfStock: settings.billing.blockOutOfStock,
      });

      // Customer: an existing one by id, a typed name (find or create), or walk-in.
      let customerId: number | null = null;
      if (input.customer && "id" in input.customer) {
        const found = await CustomerService.findCustomer(input.customer.id, tx);
        if (!found) throw HttpError.badRequest("That customer no longer exists.");
        customerId = found.id;
      } else if (input.customer) {
        customerId = await CustomerService.resolveNewCustomer(input.customer, tx);
      }

      const billNo = completing ? await nextBillNo(tx, now, settings) : (held?.billNo ?? `HOLD-${randomUUID().slice(0, 8)}`);
      const header = billHeader(plan, {
        billNo,
        customerId,
        currency: settings.locale.currency,
        userId: user.id,
        clientRef: input.clientRef,
        now,
      });

      let id: number;
      if (held) {
        await tx.delete(billItems).where(eq(billItems.billId, held.id));
        await tx.update(bills).set(header).where(eq(bills.id, held.id));
        id = held.id;
      } else {
        const [created] = await tx.insert(bills).values(header).returning({ id: bills.id });
        if (!created) throw new Error("Bill insert returned no row");
        id = created.id;
      }

      await tx.insert(billItems).values(
        plan.lines.map((line) => ({
          billId: id,
          menuItemId: line.menuItemId,
          name: line.name,
          price: line.price,
          sgst: line.sgst,
          cgst: line.cgst,
          quantity: line.quantity,
          discount: line.discount,
          total: line.total,
          options: line.options,
        })),
      );

      if (plan.payments.length > 0) {
        await tx.insert(payments).values(plan.payments.map((p) => ({ billId: id, ...p, createdAt: now })));
      }

      await deductStock(tx, plan, id, user.id);

      await AuditService.record(
        {
          userId: user.id,
          action: completing ? "bill.create" : "bill.hold",
          entity: "bill",
          entityId: id,
          metadata: { billNo, total: plan.totals.grandTotal, items: plan.lines.length, fromHold: held?.id ?? null },
        },
        tx,
      );
      return id;
    });
    return await getBill(billId, user);
  } catch (error) {
    // Two identical saves raced: the second hits the unique client reference. Hand back the first bill.
    if (isUniqueViolation(error, "client_ref")) {
      const winner = await findByClientRef(input.clientRef);
      if (winner && winner.createdUserId === user.id) return getBill(winner.id, user);
    }
    throw error;
  }
}

function billHeader(
  plan: BillPlan,
  ctx: { billNo: string; customerId: number | null; currency: string; userId: string; clientRef: string; now: Date },
): typeof bills.$inferInsert {
  const held = plan.status === "held";
  return {
    billNo: ctx.billNo,
    customerId: ctx.customerId,
    subtotal: plan.totals.subtotal,
    totalDiscount: plan.totals.totalDiscount,
    totalTax: plan.totals.totalTax,
    totalAmount: plan.totals.grandTotal,
    currency: ctx.currency,
    status: plan.status,
    orderType: plan.orderType,
    tableNo: plan.tableNo,
    notes: plan.notes,
    discountType: plan.discount?.type ?? null,
    discountValue: plan.discount ? parseMoney(plan.discount.value) : "0.00",
    amountPaid: plan.amountPaid,
    changeDue: plan.changeDue,
    heldAt: held ? ctx.now : null,
    clientRef: ctx.clientRef,
    createdUserId: ctx.userId,
    // The bill's date is when it was paid, so a resumed bill takes the time it is finished.
    createdAt: ctx.now,
  };
}

/** Takes sold quantities off tracked items and writes one ledger row per item. */
async function deductStock(tx: Transaction, plan: BillPlan, billId: number, userId: string): Promise<void> {
  for (const [menuItemId, quantity] of [...plan.stockUse].sort((a, b) => a[0] - b[0])) {
    const [updated] = await tx
      .update(menuItems)
      .set({ stockQty: sql`${menuItems.stockQty} - ${quantity}::numeric` })
      .where(eq(menuItems.id, menuItemId))
      .returning({ stockQty: menuItems.stockQty });
    if (!updated) throw new Error(`Menu item ${menuItemId} disappeared while billing`);
    await tx.insert(stockMovements).values({
      menuItemId,
      delta: new D(quantity).negated().toFixed(3),
      reason: "sale",
      billId,
      userId,
      balanceAfter: updated.stockQty,
    });
  }
}
