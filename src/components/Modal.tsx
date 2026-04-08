"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 440,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 animate-in"
        style={{
          background: "rgba(9, 9, 11, 0.45)",
          backdropFilter: "blur(2px)",
        }}
      />

      <div
        ref={dialogRef}
        className="relative card overflow-hidden animate-up"
        style={{
          width: "100%",
          maxWidth: width,
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.06), 0 20px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {(title || description) && (
          <div className="px-5 pt-5 pb-4 border-b divider">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-[15px] font-semibold tracking-tight"
                    style={{ color: "var(--color-text)" }}
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    className="text-[12.5px] mt-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost btn-sm shrink-0"
                style={{ width: 28, padding: 0 }}
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="px-5 py-5">{children}</div>

        {footer && (
          <div
            className="px-5 py-3.5 border-t divider flex items-center justify-end gap-2"
            style={{ background: "var(--color-bg-subtle)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
