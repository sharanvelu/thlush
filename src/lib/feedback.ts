import { createHash, randomBytes } from "node:crypto";

/** How long a feedback link works after it is made. */
export const FEEDBACK_LINK_TTL_MS = 24 * 60 * 60 * 1000;

/** The secret that goes in the link: 256 random bits, URL-safe. */
export function newFeedbackToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What is stored in the database in place of the secret. */
export function hashFeedbackToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function feedbackExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + FEEDBACK_LINK_TTL_MS);
}

export type FeedbackLinkState = "open" | "expired" | "submitted";

/** Submitted wins over expired: a form that was answered stays "thanks, received" even after 24 hours. */
export function feedbackLinkState(
  row: { expiresAt: Date; submittedAt: Date | null },
  now: Date = new Date(),
): FeedbackLinkState {
  if (row.submittedAt) return "submitted";
  return row.expiresAt.getTime() <= now.getTime() ? "expired" : "open";
}

interface LinkBase {
  /** `APP_DOMAIN_CUSTOMER`, a bare hostname. */
  customerDomain?: string | null;
  /** `NEXT_PUBLIC_BASE_URL`, used when no customer domain is set (local development, previews). */
  baseUrl: string;
}

/**
 * The address the customer opens. On the customer domain the proxy puts `/c` in front of every path itself,
 * so the link has none; without a customer domain the page is reached directly under `/c`.
 */
export function buildFeedbackUrl(token: string, { customerDomain, baseUrl }: LinkBase): string {
  const domain = customerDomain?.trim();
  if (domain) {
    const local = /(^|\.)localhost(:\d+)?$/.test(domain);
    return `${local ? "http" : "https"}://${domain}/feedback/${token}`;
  }
  return `${baseUrl.replace(/\/+$/, "")}/c/feedback/${token}`;
}

/** The form only asks for contact details the bill's customer does not already have on file. */
export function contactFieldsNeeded(customer: { name: string | null; phone: string | null } | null): {
  name: boolean;
  phone: boolean;
} {
  return { name: !customer?.name?.trim(), phone: !customer?.phone?.trim() };
}

export const RATING_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"] as const;

/** Average of 1 to 5 ratings with one decimal, or null when there are none. */
export function averageRating(ratings: ReadonlyArray<number>): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

/**
 * Where the customer's browser posts the answers. On the customer domain `/api/*` is mapped to `/api/c/*` by
 * the proxy, so the plain path is used there; without a customer domain the page is reached under `/c`, so the
 * route is too.
 */
export function feedbackSubmitPath(token: string, customerDomain?: string | null): string {
  return customerDomain?.trim() ? `/api/feedback/${token}` : `/api/c/feedback/${token}`;
}
