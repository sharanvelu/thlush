import { boolean, index, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { bigId, bigRef, createdAt, ix, table } from "./_shared";
import { billItems } from "./bill-items";
import { bills } from "./bills";

/**
 * One customer feedback form per bill. The row is created when staff press "Get feedback" on the bill, with
 * the link's expiry; the customer's answers are filled in on submit. Only a hash of the link's secret is kept,
 * so a database read cannot be turned into a working link.
 */
export const billFeedback = table(
  "bill_feedback",
  {
    id: bigId(),
    billId: bigRef("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    /** SHA-256 of the secret in the link, hex. */
    tokenHash: text("token_hash").notNull(),
    /** The link stops working at this moment (24 hours after it was made). */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Null until the customer submits. A form can only be submitted once. */
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    /** 1 to 5 stars each. Null until submitted. */
    overallRating: integer("overall_rating"),
    ambienceRating: integer("ambience_rating"),
    serviceRating: integer("service_rating"),
    experienceRating: integer("experience_rating"),
    wouldRecommend: boolean("would_recommend"),
    comment: text("comment"),
    /** Only asked when the bill's customer has no name or phone on file. */
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex(ix("bill_feedback_bill_key")).on(t.billId),
    uniqueIndex(ix("bill_feedback_token_key")).on(t.tokenHash),
    index(ix("bill_feedback_submitted_idx")).on(t.submittedAt),
  ],
);

/** A star rating (and optional note) for one line of the bill. `item_name` is a snapshot, like on the bill. */
export const billFeedbackItems = table(
  "bill_feedback_items",
  {
    id: bigId(),
    feedbackId: bigRef("feedback_id")
      .notNull()
      .references(() => billFeedback.id, { onDelete: "cascade" }),
    billItemId: bigRef("bill_item_id").references(() => billItems.id, { onDelete: "set null" }),
    itemName: text("item_name").notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment"),
  },
  (t) => [index(ix("bill_feedback_items_feedback_idx")).on(t.feedbackId)],
);

export type BillFeedbackRow = typeof billFeedback.$inferSelect;
