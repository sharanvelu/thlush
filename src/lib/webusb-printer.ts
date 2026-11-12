/**
 * Prints ESC/POS bytes straight from the browser over WebUSB (Chrome and Edge, on Windows, macOS,
 * Linux and ChromeOS). The cashier connects the printer once; Chrome remembers the permission.
 * Browser only: call these from event handlers or effects, never during render.
 */

/** USB class 7 is "printer". Some thermal printers report a vendor-specific class instead, so Caysn is listed too. */
const PRINTER_FILTERS: USBDeviceFilter[] = [{ classCode: 0x07 }, { vendorId: 0x4b43 }];
const CHUNK = 16 * 1024;

export class UsbPrintError extends Error {}

export function webUsbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

const isPrinter = (device: USBDevice) =>
  PRINTER_FILTERS.some((f) =>
    f.vendorId !== undefined
      ? device.vendorId === f.vendorId
      : device.configurations.some((c) => c.interfaces.some((i) => i.alternates.some((a) => a.interfaceClass === f.classCode))),
  );

/** The printer the cashier connected earlier, if any. Needs no click, so it works on page load. */
export async function getConnectedPrinter(): Promise<USBDevice | null> {
  if (!webUsbSupported()) return null;
  const devices = await navigator.usb.getDevices();
  return devices.find(isPrinter) ?? null;
}

/** Opens Chrome's device chooser. Must be called from a click. Resolves to null if the cashier cancels. */
export async function connectPrinter(): Promise<USBDevice | null> {
  if (!webUsbSupported()) throw new UsbPrintError("This browser cannot connect to a USB printer. Use Chrome or Edge.");
  try {
    return await navigator.usb.requestDevice({ filters: PRINTER_FILTERS });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return null; // closed the chooser
    throw error;
  }
}

function explain(error: unknown): UsbPrintError {
  if (error instanceof UsbPrintError) return error;
  const name = error instanceof DOMException ? error.name : "";
  if (name === "SecurityError" || name === "NetworkError" || /access denied|busy|claim/i.test(String(error))) {
    const onWindows = typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent);
    return new UsbPrintError(
      onWindows
        ? "Windows is holding the printer with its own printer driver, so the browser cannot use it. Switch the printer to the WinUSB driver once (steps in the printer setup guide), or choose \"Print dialog\" in the printer menu at the top to print through the driver."
        : "The printer is in use by another program or driver. Close other apps that use it, remove any print queue for it, and try again.",
    );
  }
  if (name === "NotFoundError") return new UsbPrintError("The printer was unplugged or switched off.");
  return new UsbPrintError(error instanceof Error ? error.message : "Could not print.");
}

async function write(device: USBDevice, bytes: Uint8Array): Promise<void> {
  await device.open();
  try {
    if (device.configuration === null) await device.selectConfiguration(1);
    const iface = device.configuration?.interfaces.find(
      (i) => i.alternates.some((a) => a.interfaceClass === 0x07) && i.alternates.some((a) => a.endpoints.some((e) => e.direction === "out")),
    ) ?? device.configuration?.interfaces.find((i) => i.alternates.some((a) => a.endpoints.some((e) => e.direction === "out")));
    const out = iface?.alternates.flatMap((a) => a.endpoints).find((e) => e.direction === "out");
    if (!iface || !out) throw new UsbPrintError("This device has no printer output.");

    await device.claimInterface(iface.interfaceNumber);
    try {
      for (let offset = 0; offset < bytes.length; offset += CHUNK) {
        const result = await device.transferOut(out.endpointNumber, bytes.slice(offset, offset + CHUNK));
        if (result.status !== "ok") throw new UsbPrintError(`The printer stopped responding (${result.status}).`);
      }
    } finally {
      await device.releaseInterface(iface.interfaceNumber).catch(() => {});
    }
  } finally {
    await device.close().catch(() => {});
  }
}

/** Jobs go one at a time: two writers on one USB interface would fail. */
let queue: Promise<unknown> = Promise.resolve();

/** Sends bytes to the connected printer. Throws `UsbPrintError` with a message fit to show the cashier. */
export function printBytesUsb(device: USBDevice, bytes: Uint8Array): Promise<void> {
  const job = queue.then(() => write(device, bytes)).catch((error: unknown) => {
    throw explain(error);
  });
  queue = job.catch(() => {});
  return job;
}
