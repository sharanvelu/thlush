import { toast } from "sonner";
import { isBlankSection, buildCustomPrintJob, type CustomSection } from "@/lib/escpos-custom";
import { getPrintMethod } from "@/lib/print-method";
import { getConnectedPrinter, printBytesUsb, UsbPrintError } from "@/lib/webusb-printer";
import type { PaperSize } from "@/types/settings";

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
 * Sends ESC/POS bytes out the first way that works: the USB printer connected in this browser (WebUSB),
 * else the local print agent. Throws `AgentUnreachableError` when neither is available.
 */
async function deliver(bytes: Uint8Array): Promise<void> {
  const printer = await getConnectedPrinter().catch(() => null);
  if (printer) return printBytesUsb(printer, bytes);
  await sendToAgent(bytes.buffer as ArrayBuffer);
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
    await deliver(new Uint8Array(await response.arrayBuffer()));
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

/** How a custom print ended: sent to the thermal printer, handed to the print dialog, or failed (already toasted). */
export type CustomPrintResult = "printer" | "dialog" | "failed";

/**
 * Prints free-text blocks, one slip per block with a paper cut after each. Uses the same engine as
 * bills: raw ESC/POS over USB or the print agent, or the print dialog when this computer is set to
 * that (or when no thermal printer is reachable).
 */
export async function printCustomText(sections: CustomSection[], paperSize: PaperSize): Promise<CustomPrintResult> {
  const blocks = sections.filter((s) => !isBlankSection(s));
  if (blocks.length === 0) return "failed";
  if (getPrintMethod() === "dialog") {
    await printTextInBrowser(blocks, paperSize);
    return "dialog";
  }
  try {
    await deliver(buildCustomPrintJob(blocks, paperSize));
    return "printer";
  } catch (error) {
    if (error instanceof AgentUnreachableError) {
      toast.warning("No printer connected. Use the printer button at the top to connect it. Using the print dialog for now.");
      await printTextInBrowser(blocks, paperSize);
      return "dialog";
    }
    toast.error(error instanceof Error ? error.message : "Printing failed.");
    return "failed";
  }
}

/**
 * Fallback for custom text: prints the blocks through the browser's print dialog, each on its own page so a
 * driver that cuts per page cuts between them. Built with text nodes, so typed text can never become markup.
 */
export function printTextInBrowser(sections: CustomSection[], paperSize: PaperSize): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      frame.remove();
      toast.error("Could not open the print dialog.");
      return resolve();
    }

    const style = doc.createElement("style");
    style.textContent = `
      @page { size: ${paperSize} auto; margin: 2mm; }
      body { margin: 0; background: #fff; color: #000; font-family: "Courier New", ui-monospace, monospace; font-size: 12px; line-height: 1.35; }
      .block { white-space: pre-wrap; overflow-wrap: anywhere; padding: 2mm 0; }
      .block:not(:last-child) { break-after: page; }
    `;
    doc.head.appendChild(style);
    for (const section of sections) {
      const block = doc.createElement("div");
      block.className = "block";
      block.textContent = section.text.replace(/\s+$/, "");
      block.style.textAlign = section.align;
      if (section.bold) block.style.fontWeight = "700";
      if (section.large) block.style.fontSize = "24px";
      doc.body.appendChild(block);
    }

    const finish = () => {
      window.clearTimeout(timer);
      frame.remove();
      resolve();
    };
    const timer = window.setTimeout(finish, 60_000);
    win.addEventListener("afterprint", finish);
    // Give layout a moment so the print preview is not blank.
    window.setTimeout(() => win.print(), 250);
  });
}
