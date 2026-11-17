"use client";

import { LoaderCircle } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * Covers the whole screen while logging out, until the page navigates away. Rendered into `document.body`
 * because the top bar's blur would otherwise make "fixed" mean "inside the top bar".
 */
export function LogoutOverlay() {
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label="Logging out"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm"
    >
      <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium">Logging out…</p>
    </div>,
    document.body,
  );
}
