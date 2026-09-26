"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { BrandWordmark } from "@/components/brand-wordmark";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function MobileMarketDialog({ open, title, children, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const initial = dialog?.querySelector<HTMLElement>(focusableSelector);
    initial?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-x-hidden bg-[var(--canvas)] lg:hidden">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Market details: ${title}`}
        className="h-dvh w-full overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <div className="sticky top-0 z-10 flex min-h-[52px] items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--canvas)] px-4">
          <BrandWordmark />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-8 items-center gap-2 rounded-[4px] px-2 text-xs text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--text)] active:text-[var(--accent-strong)]"
            aria-label="Close market details"
          >
            <X aria-hidden="true" className="size-4" />
            Close
          </button>
        </div>
        <div className="px-5 py-7">{children}</div>
      </div>
    </div>
  );
}
