"use client";

import { Star } from "lucide-react";
import { useId, useState } from "react";
import { RATING_LABELS } from "@/lib/feedback";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** What is being rated, read out by screen readers and shown as the group's name. */
  label: string;
  value: number;
  onChange: (value: number) => void;
  size?: "md" | "lg";
  invalid?: boolean;
  /** Hide the visible label when the surrounding text already names it. */
  hideLabel?: boolean;
}

/**
 * 1 to 5 stars as a group of real radio buttons, so the keyboard (arrow keys), screen readers and touch all work
 * without extra code. Filled stars use the theme's warning colour, empty ones a muted outline, so both themes read.
 */
export function StarRating({ label, value, onChange, size = "md", invalid, hideLabel }: StarRatingProps) {
  const name = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const px = size === "lg" ? "size-10" : "size-8";

  return (
    <fieldset className="min-w-0">
      <legend className={cn("text-sm font-medium", hideLabel && "sr-only", invalid && "text-destructive")}>
        {label}
        {invalid ? <span className="sr-only"> (required)</span> : null}
      </legend>
      <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            onMouseEnter={() => setHover(n)}
            className={cn(
              "relative flex cursor-pointer items-center justify-center rounded-md p-0.5 transition-transform active:scale-90 motion-reduce:transition-none",
              "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span className="sr-only">
              {n} {n === 1 ? "star" : "stars"}, {RATING_LABELS[n - 1]}
            </span>
            <Star
              aria-hidden
              className={cn(
                px,
                "transition-colors motion-reduce:transition-none",
                n <= shown ? "fill-warning text-warning" : "text-muted-foreground/50",
              )}
            />
          </label>
        ))}
        <span aria-hidden className="ml-2 min-w-20 text-sm text-muted-foreground">
          {value > 0 ? RATING_LABELS[value - 1] : ""}
        </span>
      </div>
    </fieldset>
  );
}
