/**
 * Prints a saved bill's receipt without leaving the page: loads it in a hidden
 * frame, which opens the print dialog itself. Resolves when printing finishes
 * (or after a minute, if the browser never says).
 *
 * With `kitchen`, a kitchen slip follows the receipt as its own page, so a thermal
 * printer set to cut after each page cuts between the two.
 */
export function printReceipt(billId: number, options: { kitchen?: boolean } = {}): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    frame.src = `/receipt/${billId}?print=1${options.kitchen ? "&kitchen=1" : ""}`;

    const finish = () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      frame.remove();
      resolve();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data?.type === "receipt-printed") finish();
    };
    const timer = window.setTimeout(finish, 60_000);
    window.addEventListener("message", onMessage);
    document.body.appendChild(frame);
  });
}
