'use client';

import {useEffect, useRef} from "react";
import Icon from "@/components/Icon";

type ConfirmModalVariant = 'alert' | 'info';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  variant?: ConfirmModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  variant = 'alert',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const alert: boolean = variant === 'alert';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
      <div className="pop w-full max-w-[400px] rounded-2xl bg-raised p-5 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3.5">
          <div className={`grid size-9 shrink-0 place-items-center rounded-full ${alert ? 'bg-bad-soft text-bad' : 'bg-accent-soft text-accent'}`}>
            <Icon name={alert ? 'alert' : 'sparkles'} size={17}/>
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
            <p className="mt-1 text-[13px] text-ink-2">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`btn ${alert ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
