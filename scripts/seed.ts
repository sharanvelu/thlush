/**
 * Seeds demo data: users, settings, categories, menu items, customers,
 * suppliers, a purchase, and ~150 demo bills with stock movements.
 *
 * Usage:   npm run db:seed
 * Refuses to run when NEXT_PUBLIC_APP_ENV=production unless you pass --force.
 *
 * Safe to run repeatedly: users, categories, items and settings are inserted
 * only if missing, and demo bills are created only when there are none yet.
 */
import { config } from "dotenv";
import { count, eq, inArray, sql } from "drizzle-orm";

config({ path: [".env.local", ".env"], quiet: true });

// ---------------------------------------------------------------------------
// Deterministic randomness, so every run produces the same demo data.
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261030);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(rand() * items.length)];
  if (item === undefined) throw new Error("pick() called with an empty list");
  return item;
}

function weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let roll = rand() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error("weighted() called with an empty list");
  return last[0];
}

// ---------------------------------------------------------------------------
// Static demo content
// ---------------------------------------------------------------------------
interface CategoryDef {
  name: string;
  description: string;
  color: string;
  icon: string;
}

const CATEGORIES: readonly CategoryDef[] = [
  { name: "Beverages", description: "Coffee, tea and cold drinks", color: "#f97316", icon: "coffee" },
  { name: "South Indian", description: "Dosas, idlis and breakfast favourites", color: "#eab308", icon: "utensils" },
  { name: "North Indian", description: "Curries, gravies and rice", color: "#dc2626", icon: "soup" },
  { name: "Snacks", description: "Quick bites and starters", color: "#16a34a", icon: "sandwich" },
  { name: "Chinese", description: "Indo-Chinese favourites", color: "#0891b2", icon: "egg-fried" },
  { name: "Desserts", description: "Sweets and ice creams", color: "#db2777", icon: "ice-cream-cone" },
  { name: "Breads", description: "Naan, roti and parathas", color: "#a16207", icon: "wheat" },
  { name: "Combos", description: "Meals and value combos", color: "#7c3aed", icon: "package" },
];

interface ItemDef {
  category: string;
  name: string;
  price: string;
  sku: string;
  veg: boolean | null;
  /** SGST and CGST each, in percent. Defaults to 2.5. */
  rate?: string;
  disabled?: boolean;
  /** Present when stock is tracked: opening quantity, reorder level, cost. */
  stock?: { opening: number; reorder: number; cost: string };
  cost?: string;
  variants?: Array<{ name: string; priceDelta: string }>;
  addons?: Array<{ name: string; price: string }>;
}

const ITEMS: readonly ItemDef[] = [
  // Beverages
  { category: "Beverages", name: "Filter Coffee", price: "40", sku: "BEV-001", veg: true, cost: "14" },
  { category: "Beverages", name: "Masala Chai", price: "25", sku: "BEV-002", veg: true, cost: "8" },
  {
    category: "Beverages", name: "Cold Coffee", price: "90", sku: "BEV-003", veg: true, cost: "30",
    variants: [{ name: "Regular", priceDelta: "0" }, { name: "Large", priceDelta: "30" }],
    addons: [{ name: "Extra shot", price: "25" }],
  },
  { category: "Beverages", name: "Fresh Lime Soda", price: "60", sku: "BEV-004", veg: true, cost: "16" },
  { category: "Beverages", name: "Mango Lassi", price: "80", sku: "BEV-005", veg: true, cost: "28" },
  {
    category: "Beverages", name: "Packaged Water 1L", price: "20", sku: "BEV-006", veg: null, rate: "9",
    stock: { opening: 240, reorder: 24, cost: "12" },
  },
  {
    category: "Beverages", name: "Soft Drink 300ml", price: "40", sku: "BEV-007", veg: null, rate: "9",
    stock: { opening: 200, reorder: 24, cost: "28" },
  },
  // South Indian
  { category: "South Indian", name: "Masala Dosa", price: "90", sku: "SIN-001", veg: true, cost: "32" },
  { category: "South Indian", name: "Plain Dosa", price: "70", sku: "SIN-002", veg: true, cost: "22" },
  { category: "South Indian", name: "Idli (2 pcs)", price: "50", sku: "SIN-003", veg: true, cost: "14" },
  { category: "South Indian", name: "Medu Vada (2 pcs)", price: "55", sku: "SIN-004", veg: true, cost: "18" },
  { category: "South Indian", name: "Ghee Pongal", price: "80", sku: "SIN-005", veg: true, cost: "26" },
  { category: "South Indian", name: "Onion Uttapam", price: "85", sku: "SIN-006", veg: true, cost: "28" },
  // North Indian
  { category: "North Indian", name: "Paneer Butter Masala", price: "220", sku: "NIN-001", veg: true, cost: "90" },
  { category: "North Indian", name: "Dal Makhani", price: "180", sku: "NIN-002", veg: true, cost: "60" },
  { category: "North Indian", name: "Butter Chicken", price: "280", sku: "NIN-003", veg: false, cost: "120" },
  { category: "North Indian", name: "Chicken Biryani", price: "260", sku: "NIN-004", veg: false, cost: "105" },
  { category: "North Indian", name: "Jeera Rice", price: "120", sku: "NIN-005", veg: true, cost: "35" },
  { category: "North Indian", name: "Mixed Veg Curry", price: "170", sku: "NIN-006", veg: true, cost: "58" },
  // Snacks
  {
    category: "Snacks", name: "Samosa (2 pcs)", price: "40", sku: "SNK-001", veg: true,
    stock: { opening: 200, reorder: 20, cost: "18" },
  },
  {
    category: "Snacks", name: "Veg Puff", price: "30", sku: "SNK-002", veg: true,
    stock: { opening: 150, reorder: 20, cost: "13" },
  },
  { category: "Snacks", name: "French Fries", price: "90", sku: "SNK-003", veg: true, cost: "30" },
  { category: "Snacks", name: "Paneer Tikka", price: "200", sku: "SNK-004", veg: true, cost: "80" },
  { category: "Snacks", name: "Chicken 65", price: "180", sku: "SNK-005", veg: false, cost: "72" },
  { category: "Snacks", name: "Veg Sandwich", price: "80", sku: "SNK-006", veg: true, cost: "28" },
  // Chinese
  { category: "Chinese", name: "Veg Fried Rice", price: "140", sku: "CHN-001", veg: true, cost: "45" },
  { category: "Chinese", name: "Chicken Fried Rice", price: "170", sku: "CHN-002", veg: false, cost: "62" },
  { category: "Chinese", name: "Veg Manchurian", price: "150", sku: "CHN-003", veg: true, cost: "50" },
  { category: "Chinese", name: "Hakka Noodles", price: "150", sku: "CHN-004", veg: true, cost: "48" },
  { category: "Chinese", name: "Chilli Chicken", price: "220", sku: "CHN-005", veg: false, cost: "88" },
  // Desserts
  {
    category: "Desserts", name: "Gulab Jamun (2 pcs)", price: "60", sku: "DST-001", veg: true,
    stock: { opening: 120, reorder: 20, cost: "22" },
  },
  {
    category: "Desserts", name: "Ice Cream Scoop", price: "50", sku: "DST-002", veg: true,
    stock: { opening: 200, reorder: 30, cost: "20" },
  },
  { category: "Desserts", name: "Brownie with Ice Cream", price: "140", sku: "DST-003", veg: true, cost: "52" },
  { category: "Desserts", name: "Rasmalai", price: "90", sku: "DST-004", veg: true, cost: "34" },
  { category: "Desserts", name: "Kulfi", price: "70", sku: "DST-005", veg: true, cost: "26", disabled: true },
  // Breads
  { category: "Breads", name: "Butter Naan", price: "40", sku: "BRD-001", veg: true, cost: "11" },
  { category: "Breads", name: "Tandoori Roti", price: "20", sku: "BRD-002", veg: true, cost: "6" },
  { category: "Breads", name: "Garlic Naan", price: "55", sku: "BRD-003", veg: true, cost: "15" },
  { category: "Breads", name: "Aloo Paratha", price: "60", sku: "BRD-004", veg: true, cost: "19" },
  // Combos
  { category: "Combos", name: "Lunch Thali", price: "180", sku: "CMB-001", veg: true, cost: "68" },
  { category: "Combos", name: "Dosa Combo", price: "130", sku: "CMB-002", veg: true, cost: "46" },
  { category: "Combos", name: "Biryani Combo", price: "290", sku: "CMB-003", veg: false, cost: "115", disabled: true },
];

const CUSTOMERS = [
  { name: "Ananya Rao", phone: "9845010001", email: "ananya.rao@example.com", tags: ["regular"] },
  { name: "Karthik Subramanian", phone: "9845010002", email: null, tags: ["regular", "office"] },
  { name: "Meera Nair", phone: "9845010003", email: "meera.nair@example.com", tags: [] },
  { name: "Rohan Mehta", phone: "9845010004", email: null, tags: ["delivery"] },
  { name: "Divya Krishnan", phone: "9845010005", email: "divya.k@example.com", tags: ["regular"] },
  { name: "Imran Sheikh", phone: "9845010006", email: null, tags: [] },
  { name: "Lakshmi Iyer", phone: "9845010007", email: "lakshmi.iyer@example.com", tags: ["family"] },
  { name: "Vikram Singh", phone: "9845010008", email: null, tags: ["office"] },
  { name: "Sneha Patil", phone: "9845010009", email: "sneha.patil@example.com", tags: [] },
  { name: "Arjun Reddy", phone: "9845010010", email: null, tags: ["delivery"] },
  { name: "Pooja Desai", phone: "9845010011", email: "pooja.desai@example.com", tags: ["regular"] },
  { name: "Faisal Khan", phone: "9845010012", email: null, tags: [] },
] as const;

const BILL_NOTES = ["Less spicy", "No onion", "Extra chutney", "Pack separately", "Birthday table"];
const VOID_REASONS = ["Customer cancelled the order", "Wrong item billed", "Duplicate bill", "Payment failed"];
const REFUND_REASONS = ["Food quality complaint", "Item unavailable after billing"];

/** Hour of day (IST) -> relative chance of a bill. Peaks at lunch and dinner. */
const HOUR_WEIGHTS: ReadonlyArray<readonly [number, number]> = [
  [8, 2], [9, 3], [10, 3], [11, 4], [12, 9], [13, 10], [14, 6], [15, 3],
  [16, 4], [17, 5], [18, 6], [19, 9], [20, 10], [21, 7], [22, 3],
];

const IST_OFFSET_MS = 330 * 60_000;
const DEMO_BILL_COUNT = 150;
const DEMO_DAYS = 30;

/** Builds a UTC instant from a wall-clock time in IST. */
function istToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month, day, hour, minute) - IST_OFFSET_MS);
}

function istDayKey(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10).replaceAll("-", "");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const force = process.argv.includes("--force");
  if (process.env.NEXT_PUBLIC_APP_ENV === "production" && !force) {
    console.error("Refusing to seed: NEXT_PUBLIC_APP_ENV is 'production'. Pass --force to override.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  // Loaded after dotenv so the DB client sees DATABASE_URL.
  const { db, schema } = await import("../src/db");
  const { hashPassword } = await import("../src/lib/password");
  const { calculateBill } = await import("../src/services/calculations");
  const { DEMO_USERS, seedPassword } = await import("../src/config/demo");
  const { defaultSettings } = await import("../src/config");
  const { ensureDefaultSettings } = await import("../src/services/SettingsService");
  const { parseMoney, parseQuantity, D } = await import("../src/lib/money");

  type NewBill = typeof schema.bills.$inferInsert;
  type NewBillItem = typeof schema.billItems.$inferInsert;
  type NewPayment = typeof schema.payments.$inferInsert;
  type NewMovement = typeof schema.stockMovements.$inferInsert;
  type NewAudit = typeof schema.auditLogs.$inferInsert;
  type PaymentMethod = NewPayment["method"];

  console.log("Seeding...");

  await db.transaction(async (tx) => {
    // ---- Users -----------------------------------------------------------
    const passwordHash = await hashPassword(seedPassword());
    await tx
      .insert(schema.users)
      .values(DEMO_USERS.map((u) => ({ name: u.name, email: u.email, role: u.role, password: passwordHash })))
      .onConflictDoNothing();
    const users = await tx
      .select()
      .from(schema.users)
      .where(inArray(sql`lower(${schema.users.email})`, DEMO_USERS.map((u) => u.email)));
    const userByRole = (role: string) => {
      const user = users.find((u) => u.role === role);
      if (!user) throw new Error(`Seed user with role ${role} is missing`);
      return user;
    };
    const admin = userByRole("super_admin");
    const manager = userByRole("manager");
    const cashier = userByRole("billing");

    // ---- Settings (never overwrites values someone already saved) --------
    await tx
      .insert(schema.settings)
      .values({
        key: "business",
        value: {
          ...defaultSettings.business,
          name: "Thlush Café",
          address: "12, Temple Road, Bengaluru 560001",
          phone: "+91 98450 10000",
          email: "hello@thlush.example",
          gstin: "29ABCDE1234F1Z5",
        },
        updatedBy: admin.id,
      })
      .onConflictDoNothing({ target: schema.settings.key });
    await ensureDefaultSettings(tx);

    // ---- Categories ------------------------------------------------------
    await tx
      .insert(schema.categories)
      .values(
        CATEGORIES.map((c, index) => ({
          name: c.name,
          description: c.description,
          color: c.color,
          icon: c.icon,
          sortOrder: index,
          createdUserId: admin.id,
        })),
      )
      .onConflictDoNothing();
    const categories = await tx.select().from(schema.categories);
    const categoryId = (name: string) => {
      const found = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (!found) throw new Error(`Category ${name} is missing`);
      return found.id;
    };

    // ---- Menu items ------------------------------------------------------
    await tx
      .insert(schema.menuItems)
      .values(
        ITEMS.map((item) => ({
          name: item.name,
          categoryId: categoryId(item.category),
          price: parseMoney(item.price),
          sgst: item.rate ?? "2.5",
          cgst: item.rate ?? "2.5",
          currency: defaultSettings.locale.currency,
          status: item.disabled ? ("disabled" as const) : ("active" as const),
          sku: item.sku,
          isVeg: item.veg,
          variants: item.variants ?? [],
          addons: item.addons ?? [],
          trackStock: Boolean(item.stock),
          stockQty: item.stock ? parseQuantity(item.stock.opening) : "0.000",
          reorderLevel: item.stock ? parseQuantity(item.stock.reorder) : "0.000",
          costPrice: parseMoney(item.stock?.cost ?? item.cost ?? "0"),
          createdUserId: admin.id,
        })),
      )
      .onConflictDoNothing();
    const menuItems = await tx
      .select()
      .from(schema.menuItems)
      .where(inArray(schema.menuItems.sku, ITEMS.map((i) => i.sku)));

    // ---- Demo transactions (only on an empty bills table) ----------------
    const [billCount] = await tx.select({ n: count() }).from(schema.bills);
    if ((billCount?.n ?? 0) > 0) {
      console.log("Bills already exist, skipping demo customers, suppliers and bills.");
      return;
    }

    const [customerCount] = await tx.select({ n: count() }).from(schema.customers);
    if ((customerCount?.n ?? 0) === 0) {
      await tx.insert(schema.customers).values(CUSTOMERS.map((c) => ({ ...c, tags: [...c.tags] })));
    }
    const customers = await tx.select().from(schema.customers);

    const supplierRows = await tx
      .insert(schema.suppliers)
      .values([
        { name: "Fresh Foods Wholesale", contactName: "Ramesh", phone: "9845020001", email: "orders@freshfoods.example" },
        { name: "Metro Beverages", contactName: "Sunita", phone: "9845020002", email: "sales@metrobev.example" },
      ])
      .returning();

    const sellable = menuItems.filter((m) => m.status === "active");
    if (sellable.length === 0) throw new Error("No active menu items to bill");

    // Build bills in memory, oldest first, so numbers and stock replay in order.
    const now = new Date();
    const nowIst = new Date(now.getTime() + IST_OFFSET_MS);
    const baseYear = nowIst.getUTCFullYear();
    const baseMonth = nowIst.getUTCMonth();
    const baseDay = nowIst.getUTCDate();

    interface DraftBill {
      bill: Omit<NewBill, "billNo">;
      createdAt: Date;
      lines: Array<Omit<NewBillItem, "billId">>;
      payments: Array<Omit<NewPayment, "billId">>;
      stockLines: Array<{ menuItemId: number; quantity: string }>;
    }

    const drafts: DraftBill[] = [];
    for (let i = 0; i < DEMO_BILL_COUNT; i++) {
      // More bills on recent days.
      const daysAgo = Math.min(DEMO_DAYS - 1, Math.floor(Math.pow(rand(), 1.4) * DEMO_DAYS));
      const hour = weighted(HOUR_WEIGHTS);
      let createdAt = istToUtc(baseYear, baseMonth, baseDay - daysAgo, hour, randInt(0, 59));
      if (createdAt > now) createdAt = new Date(now.getTime() - randInt(5, 120) * 60_000);

      const lineCount = weighted([[1, 2], [2, 4], [3, 4], [4, 2], [5, 1]] as const);
      const chosen = new Set<number>();
      while (chosen.size < Math.min(lineCount, sellable.length)) chosen.add(Math.floor(rand() * sellable.length));
      const picked = [...chosen].map((index) => {
        const item = sellable[index];
        if (!item) throw new Error("Index out of range while picking items");
        return { item, quantity: weighted([[1, 6], [2, 3], [3, 1]] as const), discount: rand() < 0.05 ? "10" : "0" };
      });

      const useBillDiscount = rand() < 0.12;
      const billDiscount = useBillDiscount
        ? weighted([
            [{ type: "percent" as const, value: "5" }, 3],
            [{ type: "percent" as const, value: "10" }, 2],
            [{ type: "flat" as const, value: "20" }, 2],
            [{ type: "flat" as const, value: "50" }, 1],
          ] as const)
        : null;

      const totals = calculateBill(
        picked.map((p) => ({
          price: p.item.price,
          quantity: p.quantity,
          sgst: p.item.sgst,
          cgst: p.item.cgst,
          discount: p.discount,
        })),
        { ignoreTax: defaultSettings.tax.ignoreTax, billDiscount },
      );

      const status = weighted([
        ["completed", 90], ["void", 4], ["refunded", 3], ["held", 3],
      ] as const);
      const creator = weighted([[cashier, 70], [manager, 20], [admin, 10]] as const);
      const customer = rand() < 0.4 ? pick(customers) : null;
      const orderType = weighted([["dine_in", 55], ["takeaway", 35], ["delivery", 10]] as const);

      // Payments: none for held bills. Cash records tendered cash and change.
      const total = totals.grandTotal;
      const payments: DraftBill["payments"] = [];
      let amountPaid = "0.00";
      let change = "0.00";
      if (status !== "held") {
        const method = weighted([["cash", 40], ["upi", 40], ["card", 15], ["other", 5]] as const);
        if (rand() < 0.08 && new D(total).greaterThan(100)) {
          const cashPart = parseMoney(new D(total).times(0.4).toDecimalPlaces(0));
          const rest = parseMoney(new D(total).minus(cashPart));
          payments.push({ method: "cash", amount: cashPart, createdAt }, { method: "upi", amount: rest, createdAt });
          amountPaid = total;
        } else if (method === "cash") {
          const step = weighted([[10, 4], [50, 3], [100, 3]] as const);
          const tendered = new D(total).div(step).ceil().times(step);
          payments.push({ method, amount: total, createdAt });
          amountPaid = parseMoney(tendered);
          change = parseMoney(tendered.minus(total));
        } else {
          payments.push({
            method: method as PaymentMethod,
            amount: total,
            reference: method === "upi" ? `UPI${randInt(100000000, 999999999)}` : null,
            createdAt,
          });
          amountPaid = total;
        }
      }

      const reversed = status === "void" || status === "refunded";
      const reversedAt = reversed ? new Date(createdAt.getTime() + randInt(10, 60) * 60_000) : null;
      const reason = status === "void" ? pick(VOID_REASONS) : status === "refunded" ? pick(REFUND_REASONS) : null;

      drafts.push({
        createdAt,
        bill: {
          customerId: customer?.id ?? null,
          subtotal: totals.subtotal,
          totalDiscount: totals.totalDiscount,
          totalTax: totals.totalTax,
          totalAmount: totals.grandTotal,
          currency: defaultSettings.locale.currency,
          status,
          orderType,
          tableNo: orderType === "dine_in" ? `T${randInt(1, 12)}` : null,
          notes: rand() < 0.1 ? pick(BILL_NOTES) : null,
          discountType: billDiscount?.type ?? null,
          discountValue: billDiscount ? parseMoney(billDiscount.value) : "0.00",
          amountPaid,
          changeDue: change,
          heldAt: status === "held" ? createdAt : null,
          voidedAt: reversedAt,
          voidReason: reason,
          voidedBy: reversed ? pick([manager, admin]).id : null,
          createdUserId: creator.id,
          createdAt,
        },
        lines: picked.map((p, index) => {
          const line = totals.lines[index];
          if (!line) throw new Error("Line result missing");
          return {
            menuItemId: p.item.id,
            name: p.item.name,
            price: p.item.price,
            sgst: p.item.sgst,
            cgst: p.item.cgst,
            quantity: parseQuantity(p.quantity),
            discount: line.discount,
            total: line.total,
          };
        }),
        payments,
        stockLines: picked
          .filter((p) => p.item.trackStock)
          .map((p) => ({ menuItemId: p.item.id, quantity: parseQuantity(p.quantity) })),
      });
    }

    drafts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Bill numbers: {prefix}{YYYYMMDD}-{seq}, sequence restarting each IST day.
    const seqByDay = new Map<string, number>();
    const prefix = defaultSettings.billing.billPrefix;
    const pad = defaultSettings.billing.sequencePadding;
    const billNos = drafts.map((d) => {
      const day = istDayKey(d.createdAt);
      const seq = (seqByDay.get(day) ?? 0) + 1;
      seqByDay.set(day, seq);
      return `${prefix}${day}-${String(seq).padStart(pad, "0")}`;
    });

    const insertedBills = await tx
      .insert(schema.bills)
      .values(drafts.map((d, i) => ({ ...d.bill, billNo: billNos[i] as string })))
      .returning({ id: schema.bills.id, billNo: schema.bills.billNo });
    const billIdByNo = new Map(insertedBills.map((b) => [b.billNo, b.id]));
    const billIdAt = (index: number) => {
      const id = billIdByNo.get(billNos[index] as string);
      if (id === undefined) throw new Error("Inserted bill id missing");
      return id;
    };

    await tx.insert(schema.billItems).values(
      drafts.flatMap((d, i) => d.lines.map((line) => ({ ...line, billId: billIdAt(i) }))),
    );
    const paymentRows = drafts.flatMap((d, i) => d.payments.map((p) => ({ ...p, billId: billIdAt(i) })));
    if (paymentRows.length > 0) await tx.insert(schema.payments).values(paymentRows);

    // ---- Stock ledger ----------------------------------------------------
    // Opening stock, then every sale (and its reversal), replayed in time order.
    interface StockEvent {
      menuItemId: number;
      delta: string;
      reason: NewMovement["reason"];
      billId: number | null;
      userId: string;
      note: string | null;
      createdAt: Date;
    }
    const tracked = menuItems.filter((m) => m.trackStock);
    const openingAt = new Date(now.getTime() - (DEMO_DAYS + 1) * 86_400_000);
    const events: StockEvent[] = tracked.map((m) => ({
      menuItemId: m.id,
      delta: m.stockQty,
      reason: "purchase",
      billId: null,
      userId: admin.id,
      note: "Opening stock",
      createdAt: openingAt,
    }));

    drafts.forEach((d, i) => {
      if (d.bill.status === "held") return; // Held bills do not take stock.
      for (const line of d.stockLines) {
        events.push({
          menuItemId: line.menuItemId,
          delta: new D(line.quantity).negated().toFixed(3),
          reason: "sale",
          billId: billIdAt(i),
          userId: d.bill.createdUserId ?? admin.id,
          note: null,
          createdAt: d.createdAt,
        });
        if (d.bill.status === "void" || d.bill.status === "refunded") {
          events.push({
            menuItemId: line.menuItemId,
            delta: line.quantity,
            reason: d.bill.status === "void" ? "void" : "refund",
            billId: billIdAt(i),
            userId: d.bill.voidedBy ?? admin.id,
            note: d.bill.voidReason ?? null,
            createdAt: d.bill.voidedAt ?? d.createdAt,
          });
        }
      }
    });

    // A restock from a supplier, so the demo has a purchase to show.
    const water = tracked.find((m) => m.sku === "BEV-006");
    const softDrink = tracked.find((m) => m.sku === "BEV-007");
    const supplier = supplierRows.find((s) => s.name === "Metro Beverages");
    if (water && softDrink && supplier) {
      const purchasedAt = new Date(now.getTime() - 15 * 86_400_000);
      const lines = [
        { item: water, quantity: "48", cost: "12.00" },
        { item: softDrink, quantity: "48", cost: "28.00" },
      ];
      const [purchase] = await tx
        .insert(schema.purchases)
        .values({
          supplierId: supplier.id,
          invoiceNo: "MB-2026-0412",
          totalAmount: parseMoney(lines.reduce((acc, l) => acc.plus(new D(l.quantity).times(l.cost)), new D(0))),
          notes: "Weekly restock",
          purchasedAt,
          createdUserId: manager.id,
        })
        .returning();
      if (!purchase) throw new Error("Failed to create demo purchase");
      await tx.insert(schema.purchaseItems).values(
        lines.map((l) => ({
          purchaseId: purchase.id,
          menuItemId: l.item.id,
          name: l.item.name,
          quantity: parseQuantity(l.quantity),
          costPrice: l.cost,
          total: parseMoney(new D(l.quantity).times(l.cost)),
        })),
      );
      for (const l of lines) {
        events.push({
          menuItemId: l.item.id,
          delta: parseQuantity(l.quantity),
          reason: "purchase",
          billId: null,
          userId: manager.id,
          note: `Purchase ${purchase.invoiceNo ?? purchase.id}`,
          createdAt: purchasedAt,
        });
      }
    }

    events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const balance = new Map<number, InstanceType<typeof D>>();
    const movements: NewMovement[] = [];
    const record = (event: StockEvent) => {
      const next = (balance.get(event.menuItemId) ?? new D(0)).plus(event.delta);
      if (next.isNegative()) throw new Error("Seed stock went negative; raise the opening quantity");
      balance.set(event.menuItemId, next);
      movements.push({ ...event, balanceAfter: next.toFixed(3) });
    };
    events.forEach(record);

    // Push a few items into Low / Out of stock so the alerts have something to show.
    const adjustTo = (sku: string, target: number, reason: StockEvent["reason"], note: string) => {
      const item = tracked.find((m) => m.sku === sku);
      if (!item) return;
      const current = balance.get(item.id) ?? new D(0);
      const delta = new D(target).minus(current);
      if (delta.isZero()) return;
      record({
        menuItemId: item.id,
        delta: delta.toFixed(3),
        reason,
        billId: null,
        userId: manager.id,
        note,
        createdAt: new Date(now.getTime() - 2 * 3_600_000),
      });
    };
    adjustTo("SNK-001", 12, "wastage", "Stale batch discarded");
    adjustTo("BEV-007", 0, "correction", "Stock count: crate missing");
    adjustTo("BEV-006", 22, "damage", "Damaged cartons");

    await tx.insert(schema.stockMovements).values(movements);
    for (const [menuItemId, qty] of balance) {
      await tx
        .update(schema.menuItems)
        .set({ stockQty: qty.toFixed(3) })
        .where(eq(schema.menuItems.id, menuItemId));
    }

    // ---- Audit trail -----------------------------------------------------
    const audit: NewAudit[] = DEMO_USERS.map((demo) => {
      const user = users.find((u) => u.email.toLowerCase() === demo.email);
      return {
        userId: user?.id ?? null,
        action: "login",
        entity: "user",
        entityId: user?.id ?? null,
        metadata: { method: "password" },
        createdAt: new Date(now.getTime() - randInt(1, 48) * 3_600_000),
      };
    });
    drafts.forEach((d, i) => {
      if (d.bill.status !== "void" && d.bill.status !== "refunded") return;
      audit.push({
        userId: d.bill.voidedBy ?? null,
        action: d.bill.status === "void" ? "bill.void" : "bill.refund",
        entity: "bill",
        entityId: String(billIdAt(i)),
        metadata: { billNo: billNos[i] ?? null, reason: d.bill.voidReason ?? null },
        createdAt: d.bill.voidedAt ?? d.createdAt,
      });
    });
    await tx.insert(schema.auditLogs).values(audit);

    console.log(
      `Created ${drafts.length} bills, ${movements.length} stock movements and ${customers.length} customers.`,
    );
  });

  console.log("Seed complete.");
  console.log("Demo logins (password from SEED_PASSWORD, default Password@123):");
  for (const user of (await import("../src/config/demo")).DEMO_USERS) {
    console.log(`  ${user.role.padEnd(12)} ${user.email}`);
  }
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
