/* eslint-disable @next/next/no-img-element -- photos come from our own authenticated image route and are already small */
import { Utensils } from "lucide-react";
import { D } from "@/lib/money";
import { cn } from "@/lib/utils";

/** The standard Indian packaging mark: green dot for vegetarian, red for non-vegetarian. */
export function VegMark({ isVeg, className }: { isVeg: boolean | null; className?: string }) {
  if (isVeg === null) return null;
  return (
    <span
      role="img"
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border-2",
        isVeg ? "border-green-600" : "border-red-600",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", isVeg ? "bg-green-600" : "bg-red-600")} />
    </span>
  );
}

interface ItemThumbProps {
  src: string | null;
  name: string;
  className?: string;
}

/** Product photo, or a neutral tile when there is none. Alt text is empty because the name is shown beside it. */
export function ItemThumb({ src, name, className }: ItemThumbProps) {
  return (
    <span
      className={cn("flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground", className)}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" data-name={name} />
      ) : (
        <Utensils className="size-4" aria-hidden />
      )}
    </span>
  );
}

/** "5%" for combined tax, with the SGST/CGST split available as a tooltip. */
export function taxLabel(sgst: string, cgst: string): { total: string; detail: string } {
  const total = new D(sgst).plus(cgst);
  return { total: `${total.toString()}%`, detail: `SGST ${new D(sgst).toString()}% + CGST ${new D(cgst).toString()}%` };
}
