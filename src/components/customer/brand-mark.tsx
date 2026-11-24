/* eslint-disable @next/next/no-img-element -- the logo is already a small stored image served by /brand-icon */
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

/** The shop's logo from Settings, or a leaf in the accent colour when there is none. */
export function BrandMark({ logoSrc, name, className }: { logoSrc: string | null; name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-brand ring-1 ring-primary/25",
        className,
      )}
    >
      {logoSrc ? (
        <img src={logoSrc} alt={`${name} logo`} className="size-full object-contain p-1.5" />
      ) : (
        <Leaf className="size-1/2" aria-hidden />
      )}
    </span>
  );
}
