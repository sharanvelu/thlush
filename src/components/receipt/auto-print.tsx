"use client";

import { useEffect } from "react";

/**
 * Opens the print dialog once the receipt has rendered. When the page is shown
 * inside the billing screen's hidden frame, it tells the parent when printing ends.
 */
export function AutoPrint() {
  useEffect(() => {
    const done = () => {
      if (window.parent !== window) window.parent.postMessage({ type: "receipt-printed" }, window.location.origin);
    };
    window.addEventListener("afterprint", done);
    // Give fonts and layout a moment so the print preview is not blank.
    const timer = window.setTimeout(() => window.print(), 250);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", done);
    };
  }, []);
  return null;
}
