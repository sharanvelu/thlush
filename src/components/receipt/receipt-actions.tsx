"use client";

import { Download, Mail, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReceiptActionsProps {
  billId: number;
  whatsappHref: string;
  mailHref: string;
}

/** On-screen controls for a receipt page. Hidden when printing. */
export function ReceiptActions({ billId, whatsappHref, mailHref }: ReceiptActionsProps) {
  return (
    <div className="mx-auto mb-4 flex max-w-[80mm] flex-wrap justify-center gap-2 px-3 print:hidden min-[400px]:max-w-md">
      <Button onClick={() => window.print()}>
        <Printer aria-hidden /> Print
      </Button>
      <Button variant="outline" asChild>
        <a href={`/api/bills/${billId}/pdf`} download>
          <Download aria-hidden /> PDF
        </a>
      </Button>
      <Button variant="outline" asChild>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle aria-hidden /> WhatsApp
        </a>
      </Button>
      <Button variant="outline" asChild>
        <a href={mailHref}>
          <Mail aria-hidden /> Email
        </a>
      </Button>
    </div>
  );
}
