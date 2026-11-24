import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema, type DbExecutor } from "@/db";
import { isUniqueViolation } from "@/lib/db-errors";
import { HttpError } from "@/lib/errors";
import type { StaffData, StaffPatch } from "@/lib/validation/staff";
import * as AuditService from "@/services/AuditService";

const { staffMembers, bills } = schema;

export interface StaffListItem {
  id: number;
  name: string;
  title: string | null;
  isCashier: boolean;
  status: "active" | "disabled";
  /** Bills this person has taken payment for. Someone with bills can be disabled but not deleted. */
  billCount: number;
}

/** A person who can be picked as the cashier on the billing screen. */
export interface CashierOption {
  id: number;
  name: string;
  title: string | null;
}

export async function listStaff(): Promise<StaffListItem[]> {
  const rows = await db
    .select({
      id: staffMembers.id,
      name: staffMembers.name,
      title: staffMembers.title,
      isCashier: staffMembers.isCashier,
      status: staffMembers.status,
      billCount: sql<number>`(select count(*) from ${bills} where ${bills.cashierId} = ${staffMembers.id})`.mapWith(Number),
    })
    .from(staffMembers)
    .orderBy(sql`lower(${staffMembers.name})`);
  return rows;
}

/** Active staff who can take payments, in name order, for the billing screen. */
export async function listCashierOptions(executor: DbExecutor = db): Promise<CashierOption[]> {
  return executor
    .select({ id: staffMembers.id, name: staffMembers.name, title: staffMembers.title })
    .from(staffMembers)
    .where(and(eq(staffMembers.status, "active"), eq(staffMembers.isCashier, true)))
    .orderBy(asc(sql`lower(${staffMembers.name})`));
}

/** Everyone who has ever been picked, plus the active cashiers, for the bill history filter. */
export async function listStaffOptions(): Promise<Array<{ id: number; name: string }>> {
  return db
    .select({ id: staffMembers.id, name: staffMembers.name })
    .from(staffMembers)
    .orderBy(asc(sql`lower(${staffMembers.name})`));
}

function nameTaken() {
  return new HttpError(409, "Someone with this name is already on the list.", { name: ["This name is already in use."] });
}

export async function createStaff(input: StaffData, userId: string): Promise<StaffListItem> {
  try {
    const [created] = await db.insert(staffMembers).values(input).returning({ id: staffMembers.id });
    if (!created) throw new Error("Staff insert returned no row");
    await AuditService.log({ userId, action: "staff.create", entity: "staff", entityId: created.id, metadata: { name: input.name } });
    return await getStaff(created.id);
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken();
    throw error;
  }
}

export async function getStaff(id: number): Promise<StaffListItem> {
  const found = (await listStaff()).find((s) => s.id === id);
  if (!found) throw HttpError.notFound("Staff member not found.");
  return found;
}

export async function updateStaff(id: number, patch: StaffPatch, userId: string): Promise<StaffListItem> {
  const values: Partial<typeof staffMembers.$inferInsert> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.isCashier !== undefined) values.isCashier = patch.isCashier;
  if (patch.status !== undefined) values.status = patch.status;
  try {
    if (Object.keys(values).length > 0) {
      const [updated] = await db.update(staffMembers).set(values).where(eq(staffMembers.id, id)).returning({ id: staffMembers.id });
      if (!updated) throw HttpError.notFound("Staff member not found.");
      await AuditService.log({ userId, action: "staff.update", entity: "staff", entityId: id, metadata: { fields: Object.keys(values) } });
    }
    return await getStaff(id);
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken();
    throw error;
  }
}

/** Removes someone who never took a payment. Anyone with bills must be disabled instead, so history stays intact. */
export async function deleteStaff(id: number, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [member] = await tx.select().from(staffMembers).where(eq(staffMembers.id, id)).for("update");
    if (!member) throw HttpError.notFound("Staff member not found.");
    const [used] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(bills).where(eq(bills.cashierId, id));
    if ((used?.n ?? 0) > 0) {
      throw HttpError.conflict("This person is on past bills. Disable them instead of deleting, so those bills keep their name.");
    }
    await tx.delete(staffMembers).where(eq(staffMembers.id, id));
    await AuditService.record({ userId, action: "staff.delete", entity: "staff", entityId: id, metadata: { name: member.name } }, tx);
  });
}
