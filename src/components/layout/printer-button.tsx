"use client";

import { Check, Printer, Usb } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { GLASS_MENU } from "@/components/layout/glass";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getPrintMethod, setPrintMethod, subscribePrintMethod, type PrintMethod } from "@/lib/print-method";
import { cn } from "@/lib/utils";
import { connectPrinter, getConnectedPrinter, webUsbSupported } from "@/lib/webusb-printer";

/**
 * Top-bar printer menu, open to every role. Chooses how this computer prints (thermal printer
 * directly, or the print dialog and its driver) and connects the thermal printer, once per browser.
 * The dot shows whether a thermal printer is connected.
 */
export function PrinterButton() {
  const method = useSyncExternalStore(subscribePrintMethod, getPrintMethod, () => "direct" as PrintMethod);
  const [usbSupported, setUsbSupported] = useState(false);
  const [name, setName] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const device = await getConnectedPrinter().catch(() => null);
    setName(device ? (device.productName ?? "Printer") : null);
  }, []);

  useEffect(() => {
    if (!webUsbSupported()) return;
    // WebUSB exists only in the browser, so this cannot be decided during server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsbSupported(true);
    void refresh();
    navigator.usb.addEventListener("connect", refresh);
    navigator.usb.addEventListener("disconnect", refresh);
    return () => {
      navigator.usb.removeEventListener("connect", refresh);
      navigator.usb.removeEventListener("disconnect", refresh);
    };
  }, [refresh]);

  const connect = async () => {
    try {
      const device = await connectPrinter();
      if (device) {
        await refresh();
        toast.success(`Connected to ${device.productName ?? "the printer"}.`);
      } else {
        // The chooser was closed, or it listed nothing to pick. Say so instead of doing nothing.
        toast.info(
          name
            ? `${name} is still connected. No new printer was chosen.`
            : "No printer was chosen. If no list appeared, USB access for websites may be blocked on this computer (a browser setting or an IT policy). If the list was empty, switch the printer on, replug its USB cable, and close any other program using it.",
          { duration: 10_000 },
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not connect the printer.");
    }
  };

  const direct = method === "direct";
  const label = !direct
    ? "Printer: print dialog"
    : name
      ? `Printer connected: ${name}`
      : "Printer not connected";

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={`${label}. Printer settings`}>
              <Printer className="size-4" aria-hidden />
              {direct ? (
                <span
                  aria-hidden
                  className={cn("absolute top-1.5 right-1.5 size-2 rounded-full ring-2 ring-background", name ? "bg-success" : "bg-muted-foreground/50")}
                />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className={cn("w-72", GLASS_MENU)}>
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Print method (this computer)</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={method} onValueChange={(v) => setPrintMethod(v === "dialog" ? "dialog" : "direct")}>
          <DropdownMenuRadioItem value="direct" className="items-start">
            <span className="flex flex-col gap-0.5">
              <span>Thermal printer (direct)</span>
              <span className="text-xs text-muted-foreground">No driver needed. Cuts after the receipt and after the kitchen slip.</span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dialog" className="items-start">
            <span className="flex flex-col gap-0.5">
              <span>Print dialog (printer driver)</span>
              <span className="text-xs text-muted-foreground">Uses the installed driver. One cut per bill.</span>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        {direct ? (
          <>
            <DropdownMenuSeparator />
            {usbSupported ? (
              <DropdownMenuItem onSelect={() => void connect()}>
                <Usb aria-hidden />
                <span className="flex flex-col">
                  <span>{name ? "Change printer…" : "Connect printer…"}</span>
                  {name ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="size-3 text-success" aria-hidden /> {name}
                    </span>
                  ) : null}
                </span>
              </DropdownMenuItem>
            ) : (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                This browser cannot connect to a USB printer directly. Use Chrome or Edge, or run the print agent.
              </p>
            )}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
