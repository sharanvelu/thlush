"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api-client";
import type { BillDetail } from "@/types/bill";

interface ReverseDialogProps {
  bill: BillDetail | null;
  onClose: () => void;
  onDone: (bill: BillDetail) => void;
}

/** Void or refund a completed bill. A reason is required, and tracked stock goes back on the shelf. */
export function ReverseDialog({ bill, onClose, onDone }: ReverseDialogProps) {
  const [type, setType] = useState<"void" | "refund">("void");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState(false);

  if (!bill) return null;
  const tooShort = reason.trim().length < 3;

  const submit = async () => {
    setTouched(true);
    if (tooShort) return;
    setPending(true);
    try {
      const response = await api.post<BillDetail>(`/api/bills/${bill.id}/reverse`, { type, reason: reason.trim() });
      toast.success(`${bill.billNo} ${type === "void" ? "voided" : "refunded"}. Stock has been restored.`);
      onDone(response.data);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Void or refund {bill.billNo}</DialogTitle>
          <DialogDescription>
            The bill stays in history, marked accordingly, and the items go back into stock. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">What happened?</legend>
          <RadioGroup value={type} onValueChange={(v) => setType(v as "void" | "refund")} className="gap-2">
            {[
              ["void", "Void", "Billed by mistake or cancelled before the customer left."],
              ["refund", "Refund", "The customer was charged and the money is being returned."],
            ].map(([value, label, hint]) => (
              <label
                key={value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/50"
              >
                <RadioGroupItem value={value as string} className="mt-0.5" />
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reverse-reason" className="text-sm font-medium">
            Reason (required)
          </label>
          <Textarea
            id="reverse-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={3}
            maxLength={200}
            aria-invalid={touched && tooShort}
            aria-describedby="reverse-reason-error"
            placeholder="e.g. Wrong item billed"
          />
          {touched && tooShort ? (
            <p id="reverse-reason-error" role="alert" className="text-xs text-destructive">
              Give a reason (at least 3 characters).
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Keep the bill
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            {type === "void" ? "Void bill" : "Refund bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
