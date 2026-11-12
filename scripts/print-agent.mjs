#!/usr/bin/env node
/**
 * Local print agent. A web page cannot write raw bytes to a USB printer, so this small
 * process runs on the POS computer, accepts ESC/POS bytes from the app over localhost, and
 * writes them straight to the printer's USB endpoint. No printer driver and no print queue
 * (macOS no longer supports raw queues), so nothing needs installing in the system.
 *
 *   npm run print-agent                start the agent
 *   npm run print-agent -- --list      show the USB printers it can see
 *   npm run print-agent -- --test      print a test slip (with a cut) and exit
 *
 * Environment:
 *   PRINTER_USB           optional "vendorId:productId" in hex, e.g. 4b43:3830. Default: the first
 *                         USB printer-class device found.
 *   PRINT_AGENT_PORT      port to listen on (default 9101).
 *   PRINT_AGENT_ORIGINS   comma-separated origins allowed to print
 *                         (default: http://localhost:3000,http://localhost:3001).
 *                         Add your deployed URL, e.g. https://thlush.vercel.app
 */
import http from "node:http";

const port = Number(process.env.PRINT_AGENT_PORT ?? 9101);
const allowedOrigins = (process.env.PRINT_AGENT_ORIGINS ?? "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);
const wanted = (process.env.PRINTER_USB ?? "").trim().toLowerCase();
const MAX_BYTES = 512 * 1024;
const CHUNK = 16 * 1024;
const PRINTER_CLASS = 7;

let webusb;
async function usbApi() {
  if (!webusb) {
    try {
      const { WebUSB } = await import("usb");
      webusb = new WebUSB({ allowAllDevices: true });
    } catch (e) {
      throw new Error(`The "usb" package could not be loaded (${e.message}). Run npm install on this computer.`);
    }
  }
  return webusb;
}

const hex = (n) => n.toString(16).padStart(4, "0");
const printerInterface = (device) =>
  device.configurations.flatMap((c) => c.interfaces).find((i) => i.alternates.some((a) => a.interfaceClass === PRINTER_CLASS));

/** USB printers visible to this process. */
async function listPrinters() {
  const devices = await (await usbApi()).getDevices();
  return devices.filter((d) => (wanted ? `${hex(d.vendorId)}:${hex(d.productId)}` === wanted : printerInterface(d)));
}

/** Jobs are queued one at a time: two writers on one USB interface would fail. */
let tail = Promise.resolve();
function printRaw(bytes) {
  const job = tail.then(() => writeToPrinter(bytes));
  tail = job.catch(() => {});
  return job;
}

async function writeToPrinter(bytes) {
  const [device] = await listPrinters();
  if (!device) throw new Error("No USB printer found. Is it plugged in and switched on?");
  await device.open();
  try {
    if (device.configuration === null) await device.selectConfiguration(1);
    const iface = printerInterface(device);
    if (!iface) throw new Error("This USB device has no printer interface.");
    const alt = iface.alternates.find((a) => a.interfaceClass === PRINTER_CLASS);
    const out = alt?.endpoints.find((e) => e.direction === "out");
    if (!out) throw new Error("The printer has no USB output endpoint.");
    await device.claimInterface(iface.interfaceNumber);
    try {
      for (let offset = 0; offset < bytes.length; offset += CHUNK) {
        const result = await device.transferOut(out.endpointNumber, bytes.subarray(offset, offset + CHUNK));
        if (result.status !== "ok") throw new Error(`USB transfer failed (${result.status}).`);
      }
    } finally {
      await device.releaseInterface(iface.interfaceNumber).catch(() => {});
    }
  } finally {
    await device.close().catch(() => {});
  }
}

const fail = (e) => {
  console.error(e.message);
  process.exit(1);
};

if (process.argv.includes("--list")) {
  listPrinters().then((devices) => {
    if (devices.length === 0) console.log("No USB printers found.");
    for (const d of devices) console.log(`${hex(d.vendorId)}:${hex(d.productId)}  ${d.manufacturerName ?? ""} ${d.productName ?? ""}  serial ${d.serialNumber ?? "-"}`);
  }, fail);
} else if (process.argv.includes("--test")) {
  const text = Buffer.from("Thlush printer test\nIf the paper is cut after this, ESC/POS is working.\n");
  const job = Buffer.concat([Buffer.from([0x1b, 0x40]), text, Buffer.from([0x1b, 0x64, 3, 0x1d, 0x56, 66, 0])]);
  printRaw(job).then(() => console.log("Test slip sent."), fail);
} else {
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    const allowed = origin !== undefined && allowedOrigins.includes(origin);
    const send = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (origin !== undefined && !allowed) return send(403, { error: "This site is not allowed to print." });
    if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      // Chrome asks before a public site talks to localhost.
      res.setHeader("Access-Control-Allow-Private-Network", "true");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    if (req.method === "GET" && req.url === "/health") {
      return listPrinters().then(
        (devices) => send(200, { ok: devices.length > 0, printers: devices.map((d) => d.productName ?? "USB printer") }),
        (e) => send(500, { ok: false, error: e.message }),
      );
    }
    if (req.method !== "POST" || req.url !== "/print") return send(404, { error: "Not found." });

    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        send(413, { error: "Print job is too large." });
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => {
      if (size === 0) return send(400, { error: "Empty print job." });
      printRaw(Buffer.concat(chunks)).then(
        () => send(200, { ok: true }),
        (e) => {
          console.error(e.message);
          send(502, { error: e.message });
        },
      );
    });
  });

  // Loopback only: nothing else on the network can reach the printer through this.
  server.listen(port, "127.0.0.1", () => {
    console.log(`Print agent listening on http://127.0.0.1:${port}.`);
    console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
  });
}
