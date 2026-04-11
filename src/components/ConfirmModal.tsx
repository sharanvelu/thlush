'use client';

import {useEffect, useRef} from "react";

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

const variantStyles: Record<ConfirmModalVariant, { icon: string; confirmClass: string; iconBg: string }> = {
  alert: {
    icon: '!',
    iconBg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    confirmClass: 'bg-[#dc3545] hover:bg-[#c82333] text-white',
  },
  info: {
    icon: '?',
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    confirmClass: '-bg-linear-120 from-[#ff7a18] to-[#ffb347] text-white',
  },
};

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
  const styles = variantStyles[variant];

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${styles.iconBg}`}>
            {styles.icon}
          </div>
          <div className="flex-1">
            <h3 className="m-0 text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-2 mb-0 text-sm text-gray-600 dark:text-gray-400">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelRef}
            type="button"
            className="border-2 border-solid border-[#e0d7cf] dark:border-gray-600 rounded-xl px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`border-none rounded-xl px-5 py-2 text-sm font-semibold cursor-pointer ${styles.confirmClass}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
