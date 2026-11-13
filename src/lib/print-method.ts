/**
 * How this computer prints. Stored in the browser (not the database) because it depends on how
 * this computer's printer is set up, and every role, cashiers included, may change it.
 *
 *   direct  Raw ESC/POS straight to the thermal printer (USB, or the print agent), with a paper cut
 *           after the receipt and after the kitchen slip. Falls back to the print dialog if neither works.
 *   dialog  The browser's print dialog, through the installed printer driver. One cut per bill.
 */
export type PrintMethod = "direct" | "dialog";

const KEY = "thlush.printMethod";
const EVENT = "thlush:print-method";

export function getPrintMethod(): PrintMethod {
  try {
    return window.localStorage.getItem(KEY) === "dialog" ? "dialog" : "direct";
  } catch {
    return "direct"; // storage blocked: use the default
  }
}

export function setPrintMethod(method: PrintMethod): void {
  try {
    window.localStorage.setItem(KEY, method);
  } catch {
    // Not saved, but the change still applies to this page view.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** For `useSyncExternalStore`: fires on a change here or in another tab. */
export function subscribePrintMethod(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
