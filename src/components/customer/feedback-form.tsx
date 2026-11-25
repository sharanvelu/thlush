"use client";

import { CircleCheck, Loader2, MessageSquarePlus, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { StarRating } from "@/components/customer/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FeedbackFormProps {
  billNo: string;
  businessName: string;
  items: Array<{ id: number; name: string }>;
  ask: { name: boolean; phone: boolean };
  /** Where to post the answers (differs on the customer domain, see `feedbackSubmitPath`). */
  submitPath: string;
}

type Ratings = { overall: number; ambience: number; service: number; experience: number };
const EMPTY: Ratings = { overall: 0, ambience: 0, service: 0, experience: 0 };

const CARD = "rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5";

export function FeedbackForm({ billNo, businessName, items, ask, submitPath }: FeedbackFormProps) {
  const [ratings, setRatings] = useState<Ratings>(EMPTY);
  const [itemRatings, setItemRatings] = useState<Record<number, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<number, string>>({});
  const [noteOpen, setNoteOpen] = useState<Record<number, boolean>>({});
  const [recommend, setRecommend] = useState<boolean | undefined>(undefined);
  const [comment, setComment] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const setRating = (key: keyof Ratings) => (value: number) => setRatings((r) => ({ ...r, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (Object.values(ratings).some((v) => v === 0)) {
      setMissing(true);
      setError("Please give the order, ambience, service and overall experience a star rating.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(submitPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ratings,
          wouldRecommend: recommend,
          comment,
          items: items
            .map((i) => ({ billItemId: i.id, rating: itemRatings[i.id], comment: itemNotes[i.id] ?? "" }))
            .filter((i) => i.rating || i.comment.trim()),
          contactName: ask.name ? contactName : undefined,
          contactPhone: ask.phone ? contactPhone : undefined,
        }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "We couldn't send your feedback. Please try again.");
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div role="status" className={cn(CARD, "flex flex-col items-center gap-3 py-12 text-center")}>
        <CircleCheck className="size-14 text-success" aria-hidden />
        <h2 className="text-2xl font-semibold tracking-tight">Thank you!</h2>
        <p className="max-w-sm text-muted-foreground">
          Your feedback has been sent to {businessName}. It helps us get better. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {items.length > 0 ? (
        <section className={CARD} aria-labelledby="fb-items">
          <h2 id="fb-items" className="text-lg font-semibold tracking-tight">
            How was each item?
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">Optional. Rate only what you want to.</p>
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <StarRating
                  label={item.name}
                  value={itemRatings[item.id] ?? 0}
                  onChange={(v) => setItemRatings((r) => ({ ...r, [item.id]: v }))}
                />
                {noteOpen[item.id] ? (
                  <Input
                    aria-label={`A note about ${item.name}`}
                    placeholder="Tell us more (optional)"
                    maxLength={300}
                    value={itemNotes[item.id] ?? ""}
                    onChange={(e) => setItemNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setNoteOpen((o) => ({ ...o, [item.id]: true }))}
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    <MessageSquarePlus className="size-4" aria-hidden /> Add a note
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={cn(CARD, "flex flex-col gap-5")} aria-labelledby="fb-order">
        <h2 id="fb-order" className="text-lg font-semibold tracking-tight">
          Your order
        </h2>
        <StarRating
          label="Overall rating for your order"
          size="lg"
          value={ratings.overall}
          onChange={setRating("overall")}
          invalid={missing && ratings.overall === 0}
        />
      </section>

      <section className={cn(CARD, "flex flex-col gap-5")} aria-labelledby="fb-visit">
        <h2 id="fb-visit" className="text-lg font-semibold tracking-tight">
          Your visit
        </h2>
        <StarRating
          label="Ambience"
          value={ratings.ambience}
          onChange={setRating("ambience")}
          invalid={missing && ratings.ambience === 0}
        />
        <StarRating
          label="Service"
          value={ratings.service}
          onChange={setRating("service")}
          invalid={missing && ratings.service === 0}
        />
        <StarRating
          label="Overall experience"
          value={ratings.experience}
          onChange={setRating("experience")}
          invalid={missing && ratings.experience === 0}
        />
      </section>

      <section className={cn(CARD, "flex flex-col gap-4")} aria-labelledby="fb-more">
        <h2 id="fb-more" className="text-lg font-semibold tracking-tight">
          Anything else?
        </h2>

        <fieldset>
          <legend className="text-sm font-medium">Would you recommend us to a friend?</legend>
          <div className="mt-2 flex gap-2">
            {[
              { value: true, label: "Yes", Icon: ThumbsUp },
              { value: false, label: "No", Icon: ThumbsDown },
            ].map(({ value, label, Icon }) => (
              <button
                key={label}
                type="button"
                aria-pressed={recommend === value}
                onClick={() => setRecommend(recommend === value ? undefined : value)}
                className={cn(
                  "inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors motion-reduce:transition-none",
                  recommend === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fb-comment">Comments</Label>
          <Textarea
            id="fb-comment"
            rows={4}
            maxLength={1000}
            placeholder="What did we do well? What could be better?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">{comment.length}/1000</p>
        </div>

        {ask.name || ask.phone ? (
          <div className="flex flex-col gap-3 rounded-xl bg-muted/60 p-3">
            <p className="text-sm text-muted-foreground">
              Optional: leave{" "}
              {ask.name && ask.phone ? "your name and phone number" : ask.name ? "your name" : "your phone number"} only
              if you would like us to follow up.
            </p>
            {ask.name ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fb-name">Name</Label>
                <Input
                  id="fb-name"
                  autoComplete="name"
                  maxLength={80}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
            ) : null}
            {ask.phone ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fb-phone">Phone number</Label>
                <Input
                  id="fb-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={18}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="h-12 rounded-full text-base" disabled={sending}>
        {sending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {sending ? "Sending…" : "Send feedback"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">For bill {billNo}</p>
    </form>
  );
}
