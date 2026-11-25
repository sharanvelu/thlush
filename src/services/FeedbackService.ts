import { and, asc, desc, eq, gte, ilike, isNotNull, isNull, lt, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { hasPermission } from "@/config/permissions";
import { nextDay, zonedStartOfDay } from "@/lib/dates";
import {
  buildFeedbackUrl,
  contactFieldsNeeded,
  feedbackExpiry,
  feedbackLinkState,
  hashFeedbackToken,
  newFeedbackToken,
  type FeedbackLinkState,
} from "@/lib/feedback";
import { HttpError } from "@/lib/errors";
import { resolveRange } from "@/lib/dashboard";
import type { FeedbackListQuery, FeedbackSubmit } from "@/lib/validation/feedback";
import { getEnv } from "@/env";
import * as AuditService from "@/services/AuditService";
import { getSettings } from "@/services/SettingsService";
import type { SessionUser } from "@/types/user";

const { bills, billItems, customers, billFeedback, billFeedbackItems } = schema;

// ---------------------------------------------------------------------------
// Staff: make a link for a bill
// ---------------------------------------------------------------------------

export interface FeedbackLink {
  url: string;
  expiresAt: string;
}

/**
 * Makes (or replaces) the feedback link for a completed bill. Asking again before the customer answers gives a
 * new link and the old one stops working, so there is only ever one live link per bill. A bill that already has
 * feedback cannot get another.
 */
export async function createFeedbackLink(billId: number, user: SessionUser): Promise<FeedbackLink> {
  const settings = await getSettings();
  if (!settings.features.feedback) throw HttpError.conflict("Customer feedback is turned off in Settings.");

  const [bill] = await db
    .select({ id: bills.id, status: bills.status, createdUserId: bills.createdUserId })
    .from(bills)
    .where(eq(bills.id, billId))
    .limit(1);
  // A cashier only knows about bills made on their own login.
  if (!bill || (!hasPermission(user.role, "bills.view_all") && bill.createdUserId !== user.id)) {
    throw HttpError.notFound("Bill not found.");
  }
  if (bill.status !== "completed") throw HttpError.conflict("Feedback can only be collected on a completed bill.");

  const token = newFeedbackToken();
  const expiresAt = feedbackExpiry();
  const values = { tokenHash: hashFeedbackToken(token), expiresAt };

  // Insert, or swap the secret on a form that has not been answered. An answered form matches no row.
  const [saved] = await db
    .insert(billFeedback)
    .values({ billId, ...values })
    .onConflictDoUpdate({ target: billFeedback.billId, set: values, setWhere: isNull(billFeedback.submittedAt) })
    .returning({ id: billFeedback.id });
  if (!saved) throw HttpError.conflict("Feedback for this bill has already been received.");

  await AuditService.log({ userId: user.id, action: "feedback.link", entity: "bill", entityId: billId });

  const env = getEnv();
  return {
    url: buildFeedbackUrl(token, { customerDomain: env.APP_DOMAIN_CUSTOMER, baseUrl: env.NEXT_PUBLIC_BASE_URL }),
    expiresAt: expiresAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Customer: open and submit the form
// ---------------------------------------------------------------------------

export interface FeedbackForm {
  state: FeedbackLinkState;
  billNo: string;
  businessName: string;
  items: Array<{ id: number; name: string }>;
  /** Contact details to ask for, because the bill's customer does not have them on file. */
  ask: { name: boolean; phone: boolean };
}

/** What the public form needs, looked up by the secret in the link. Null when there is no such link. */
export async function getFeedbackForm(token: string): Promise<FeedbackForm | null> {
  const [row] = await db
    .select({
      id: billFeedback.id,
      billId: billFeedback.billId,
      expiresAt: billFeedback.expiresAt,
      submittedAt: billFeedback.submittedAt,
      billNo: bills.billNo,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(billFeedback)
    .innerJoin(bills, eq(bills.id, billFeedback.billId))
    .leftJoin(customers, eq(customers.id, bills.customerId))
    .where(eq(billFeedback.tokenHash, hashFeedbackToken(token)))
    .limit(1);
  if (!row) return null;

  const settings = await getSettings();
  const state = feedbackLinkState(row);
  const items =
    state === "open"
      ? await db
          .select({ id: billItems.id, name: billItems.name })
          .from(billItems)
          .where(and(eq(billItems.billId, row.billId), eq(billItems.isPackaging, false)))
          .orderBy(asc(billItems.id))
      : [];
  return {
    state,
    billNo: row.billNo,
    businessName: settings.business.name,
    items,
    ask: contactFieldsNeeded(row.customerName ? { name: row.customerName, phone: row.customerPhone } : null),
  };
}

/** Saves the customer's answers. Works once per link, and only while it is open. */
export async function submitFeedback(token: string, input: FeedbackSubmit): Promise<void> {
  const form = await getFeedbackForm(token);
  if (!form) throw HttpError.notFound("This feedback link is not valid.");
  if (form.state === "submitted") throw HttpError.conflict("Thanks, your feedback was already received.");
  if (form.state === "expired") throw HttpError.conflict("This feedback link has expired.");

  const allowed = new Set(form.items.map((i) => i.id));
  const names = new Map(form.items.map((i) => [i.id, i.name]));
  const rated = input.items.filter((i) => i.rating !== undefined || i.comment);
  if (rated.some((i) => !allowed.has(i.billItemId)))
    throw HttpError.badRequest("An item does not belong to this bill.");

  await db.transaction(async (tx) => {
    // The guard in the WHERE makes a double submit (or two tabs) save once: the second finds no open row.
    const [done] = await tx
      .update(billFeedback)
      .set({
        submittedAt: new Date(),
        overallRating: input.overall,
        ambienceRating: input.ambience,
        serviceRating: input.service,
        experienceRating: input.experience,
        wouldRecommend: input.wouldRecommend ?? null,
        comment: input.comment ?? null,
        contactName: form.ask.name ? (input.contactName ?? null) : null,
        contactPhone: form.ask.phone ? (input.contactPhone ?? null) : null,
      })
      .where(
        and(
          eq(billFeedback.tokenHash, hashFeedbackToken(token)),
          isNull(billFeedback.submittedAt),
          sql`${billFeedback.expiresAt} > now()`,
        ),
      )
      .returning({ id: billFeedback.id });
    if (!done) throw HttpError.conflict("This feedback link is no longer open.");

    if (rated.length > 0) {
      await tx.insert(billFeedbackItems).values(
        rated.map((i) => ({
          feedbackId: done.id,
          billItemId: i.billItemId,
          itemName: names.get(i.billItemId) ?? "Item",
          rating: i.rating ?? 0,
          comment: i.comment ?? null,
        })),
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Staff: read feedback
// ---------------------------------------------------------------------------

export interface FeedbackRow {
  id: number;
  billId: number;
  billNo: string;
  submittedAt: string;
  overall: number;
  ambience: number;
  service: number;
  experience: number;
  wouldRecommend: boolean | null;
  comment: string | null;
  contact: string | null;
  items: Array<{ name: string; rating: number; comment: string | null }>;
}

export interface FeedbackSummary {
  responses: number;
  overall: number | null;
  ambience: number | null;
  service: number | null;
  experience: number | null;
  /** Share of answers (0 to 100, one decimal) that said they would recommend, among those who answered. */
  recommendPct: string | null;
}

function submittedWindow(query: FeedbackListQuery, timeZone: string): SQL[] {
  const range = resolveRange(query.range ?? "30d", query.from, query.to, timeZone);
  const where: SQL[] = [
    isNotNull(billFeedback.submittedAt),
    gte(billFeedback.submittedAt, zonedStartOfDay(range.from, timeZone)),
    lt(billFeedback.submittedAt, zonedStartOfDay(nextDay(range.to), timeZone)),
  ];
  if (query.rating) where.push(eq(billFeedback.overallRating, query.rating));
  if (query.q) where.push(ilike(bills.billNo, `%${query.q.replace(/[\\%_]/g, "\\$&")}%`));
  return where;
}

export async function listFeedback(
  query: FeedbackListQuery,
  timeZone: string,
): Promise<{ rows: FeedbackRow[]; total: number; summary: FeedbackSummary }> {
  const where = and(...submittedWindow(query, timeZone));
  const base = db
    .select({
      id: billFeedback.id,
      billId: billFeedback.billId,
      billNo: bills.billNo,
      submittedAt: billFeedback.submittedAt,
      overall: billFeedback.overallRating,
      ambience: billFeedback.ambienceRating,
      service: billFeedback.serviceRating,
      experience: billFeedback.experienceRating,
      wouldRecommend: billFeedback.wouldRecommend,
      comment: billFeedback.comment,
      contactName: billFeedback.contactName,
      contactPhone: billFeedback.contactPhone,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(billFeedback)
    .innerJoin(bills, eq(bills.id, billFeedback.billId))
    .leftJoin(customers, eq(customers.id, bills.customerId))
    .where(where);

  const [data, [stats]] = await Promise.all([
    base
      .orderBy(desc(billFeedback.submittedAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({
        responses: sql<number>`count(*)`.mapWith(Number),
        overall: sql<string | null>`avg(${billFeedback.overallRating})`,
        ambience: sql<string | null>`avg(${billFeedback.ambienceRating})`,
        service: sql<string | null>`avg(${billFeedback.serviceRating})`,
        experience: sql<string | null>`avg(${billFeedback.experienceRating})`,
        yes: sql<number>`count(*) filter (where ${billFeedback.wouldRecommend} is true)`.mapWith(Number),
        answered: sql<number>`count(${billFeedback.wouldRecommend})`.mapWith(Number),
      })
      .from(billFeedback)
      .innerJoin(bills, eq(bills.id, billFeedback.billId))
      .where(where),
  ]);

  const ids = data.map((r) => r.id);
  const itemRows = ids.length
    ? await db
        .select({
          feedbackId: billFeedbackItems.feedbackId,
          name: billFeedbackItems.itemName,
          rating: billFeedbackItems.rating,
          comment: billFeedbackItems.comment,
        })
        .from(billFeedbackItems)
        .where(sql`${billFeedbackItems.feedbackId} in ${ids}`)
        .orderBy(asc(billFeedbackItems.id))
    : [];

  const avg = (v: string | null | undefined) =>
    v === null || v === undefined ? null : Math.round(Number(v) * 10) / 10;
  const rows: FeedbackRow[] = data.map((r) => {
    const name = r.customerName ?? r.contactName;
    const phone = r.customerPhone ?? r.contactPhone;
    return {
      id: r.id,
      billId: r.billId,
      billNo: r.billNo,
      submittedAt: (r.submittedAt ?? new Date()).toISOString(),
      overall: r.overall ?? 0,
      ambience: r.ambience ?? 0,
      service: r.service ?? 0,
      experience: r.experience ?? 0,
      wouldRecommend: r.wouldRecommend,
      comment: r.comment,
      contact: [name, phone].filter(Boolean).join(" · ") || null,
      items: itemRows
        .filter((i) => i.feedbackId === r.id && i.rating > 0)
        .map((i) => ({ name: i.name, rating: i.rating, comment: i.comment })),
    };
  });

  const responses = stats?.responses ?? 0;
  return {
    rows,
    total: responses,
    summary: {
      responses,
      overall: avg(stats?.overall),
      ambience: avg(stats?.ambience),
      service: avg(stats?.service),
      experience: avg(stats?.experience),
      recommendPct: stats && stats.answered > 0 ? ((stats.yes / stats.answered) * 100).toFixed(1) : null,
    },
  };
}
