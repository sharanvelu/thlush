import { describe, expect, it } from "vitest";
import {
  FEEDBACK_LINK_TTL_MS,
  averageRating,
  buildFeedbackUrl,
  contactFieldsNeeded,
  feedbackExpiry,
  feedbackLinkState,
  feedbackSubmitPath,
  hashFeedbackToken,
  newFeedbackToken,
} from "@/lib/feedback";
import { feedbackSubmitSchema } from "@/lib/validation/feedback";

describe("feedback tokens", () => {
  it("makes a different long secret every time, and hashes it without keeping it", () => {
    const a = newFeedbackToken();
    const b = newFeedbackToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashFeedbackToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashFeedbackToken(a)).not.toContain(a);
    expect(hashFeedbackToken(a)).toBe(hashFeedbackToken(a));
  });
});

describe("feedback link state", () => {
  const now = new Date("2026-11-25T10:00:00Z");
  it("is valid for exactly 24 hours", () => {
    const expiresAt = feedbackExpiry(now);
    expect(expiresAt.getTime() - now.getTime()).toBe(FEEDBACK_LINK_TTL_MS);
    expect(feedbackLinkState({ expiresAt, submittedAt: null }, new Date(expiresAt.getTime() - 1))).toBe("open");
    expect(feedbackLinkState({ expiresAt, submittedAt: null }, expiresAt)).toBe("expired");
  });
  it("keeps a submitted form submitted even after it would have expired", () => {
    const expiresAt = feedbackExpiry(now);
    const later = new Date(expiresAt.getTime() + 1000);
    expect(feedbackLinkState({ expiresAt, submittedAt: now }, later)).toBe("submitted");
  });
});

describe("buildFeedbackUrl", () => {
  it("has no /c on the customer domain, where the proxy adds it", () => {
    expect(buildFeedbackUrl("t", { customerDomain: "order.shop.in", baseUrl: "https://pos.shop.in" })).toBe(
      "https://order.shop.in/feedback/t",
    );
  });
  it("uses http for a localhost customer domain", () => {
    expect(buildFeedbackUrl("t", { customerDomain: "order.localhost:3000", baseUrl: "http://localhost:3000" })).toBe(
      "http://order.localhost:3000/feedback/t",
    );
  });
  it("goes under /c with no customer domain", () => {
    expect(buildFeedbackUrl("t", { baseUrl: "http://localhost:3000/" })).toBe("http://localhost:3000/c/feedback/t");
  });
});

describe("contactFieldsNeeded", () => {
  it("asks for both on a walk-in bill", () => {
    expect(contactFieldsNeeded(null)).toEqual({ name: true, phone: true });
  });
  it("asks only for what is missing", () => {
    expect(contactFieldsNeeded({ name: "Asha", phone: null })).toEqual({ name: false, phone: true });
    expect(contactFieldsNeeded({ name: "Asha", phone: " " })).toEqual({ name: false, phone: true });
    expect(contactFieldsNeeded({ name: "Asha", phone: "9876543210" })).toEqual({ name: false, phone: false });
  });
});

describe("averageRating", () => {
  it("rounds to one decimal and handles no ratings", () => {
    expect(averageRating([])).toBeNull();
    expect(averageRating([5, 4, 4])).toBe(4.3);
  });
});

describe("feedbackSubmitSchema", () => {
  const ok = { overall: 5, ambience: 4, service: 4, experience: 5 };
  it("accepts the four required ratings and defaults to no items", () => {
    const parsed = feedbackSubmitSchema.parse(ok);
    expect(parsed.items).toEqual([]);
  });
  it("rejects ratings outside 1 to 5 and missing ones", () => {
    expect(feedbackSubmitSchema.safeParse({ ...ok, overall: 0 }).success).toBe(false);
    expect(feedbackSubmitSchema.safeParse({ ...ok, service: 6 }).success).toBe(false);
    expect(feedbackSubmitSchema.safeParse({ overall: 5 }).success).toBe(false);
  });
  it("turns blank comments and phone into nothing, and rejects a bad phone", () => {
    const parsed = feedbackSubmitSchema.parse({ ...ok, comment: "  ", contactPhone: "", items: [{ billItemId: 3 }] });
    expect(parsed.comment).toBeUndefined();
    expect(parsed.contactPhone).toBeUndefined();
    expect(feedbackSubmitSchema.safeParse({ ...ok, contactPhone: "12" }).success).toBe(false);
    expect(feedbackSubmitSchema.safeParse({ ...ok, contactPhone: "+91 98765 43210" }).success).toBe(true);
  });
});

describe("feedbackSubmitPath", () => {
  it("uses the mapped path on the customer domain and the direct one otherwise", () => {
    expect(feedbackSubmitPath("t", "order.shop.in")).toBe("/api/feedback/t");
    expect(feedbackSubmitPath("t", null)).toBe("/api/c/feedback/t");
    expect(feedbackSubmitPath("t", "")).toBe("/api/c/feedback/t");
  });
});
