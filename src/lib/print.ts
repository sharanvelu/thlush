import { toast } from "sonner";
import { getPrintMethod } from "@/lib/print-method";
import { getConnectedPrinter, printBytesUsb, UsbPrintError } from "@/lib/webusb-printer";

/** Where the local print agent (`npm run print-agent`) listens on the POS computer. */
const AGENT_URL = process.env.NEXT_PUBLIC_PRINT_AGENT_URL ?? "http://127.0.0.1:9101";

export interface PrintOptions {
  /** Print the kitchen slip after the receipt. */
  kitchen?: boolean;
}

class AgentUnreachableError extends Error {}

/** Sends raw ESC/POS bytes to the print agent. Throws `AgentUnreachableError` if nothing is listening. */
async function sendToAgent(bytes: ArrayBuffer): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${AGENT_URL}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: bytes,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AgentUnreachableError("The print agent is not running.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `The print agent returned ${response.status}.`);
  }
}

/**
 * Prints a saved bill on the thermal printer. The server builds the ESC/POS bytes (receipt, plus the
 * kitchen slip if asked, each followed by a paper cut), then they go out the first way that works
 * (unless this computer is set to use the print dialog, see `print-method.ts`):
 *   1. straight to the USB printer the cashier connected in this browser (WebUSB);
 *   2. the local print agent, if one is running;
 *   3. the browser's print dialog, so a bill can still be printed.
 */
export async function printReceipt(billId: number, options: PrintOptions = {}): Promise<void> {
  const kitchen = options.kitchen ?? false;
  // This computer prints through its printer driver: no raw bytes, and no warning about the thermal printer.
  if (getPrintMethod() === "dialog") return printInBrowser(billId, { kitchen });
  try {
    const response = await fetch(`/api/bills/${billId}/escpos${kitchen ? "?kitchen=1" : ""}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error("Could not prepare the receipt for printing.");
    const bytes = new Uint8Array(await response.arrayBuffer());

    const printer = await getConnectedPrinter().catch(() => null);
    if (printer) return await printBytesUsb(printer, bytes);

    await sendToAgent(bytes.buffer as ArrayBuffer);
  } catch (error) {
    if (error instanceof AgentUnreachableError) {
      toast.warning("No printer connected. Use the printer button at the top to connect it. Using the print dialog for now.");
      return printInBrowser(billId, { kitchen });
    }
    toast.error(error instanceof UsbPrintError || error instanceof Error ? error.message : "Printing failed.");
  }
}

/**
 * Fallback: loads the receipt in a hidden frame, which opens the browser's print dialog itself. Resolves
 * when printing finishes (or after a minute, if the browser never says). Thermal printers cut once per
 * job here, so the kitchen slip (if any) is a second page of the same job.
 */
export function printInBrowser(billId: number, options: PrintOptions = {}): Promise<void> {
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
