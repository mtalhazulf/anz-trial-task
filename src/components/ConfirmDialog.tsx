"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      width={400}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="btn"
            style={
              destructive
                ? {
                    background: "var(--color-danger)",
                    color: "#ffffff",
                    borderColor: "var(--color-danger)",
                  }
                : undefined
            }
          >
            {busy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {destructive && (
          <div
            className="w-9 h-9 rounded-full grid place-items-center shrink-0"
            style={{
              background: "var(--color-danger-bg)",
              color: "var(--color-danger)",
            }}
          >
            <AlertTriangle className="w-4 h-4" strokeWidth={2.25} />
          </div>
        )}
        <div className="min-w-0">
          <p
            className="text-[14px] font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            {title}
          </p>
          {description && (
            <p
              className="text-[13px] mt-1 leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
