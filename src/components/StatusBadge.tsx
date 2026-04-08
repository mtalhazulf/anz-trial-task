import type { BookingStatus } from "@/lib/types";

const statusConfig: Record<
  BookingStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  confirmed: {
    bg: "var(--color-success-bg)",
    text: "var(--color-success)",
    border: "var(--color-success-border)",
    label: "Confirmed",
  },
  pending: {
    bg: "var(--color-warning-bg)",
    text: "var(--color-warning)",
    border: "var(--color-warning-border)",
    label: "Pending",
  },
  cancelled: {
    bg: "var(--color-danger-bg)",
    text: "var(--color-danger)",
    border: "var(--color-danger-border)",
    label: "Cancelled",
  },
};

export default function StatusBadge({ status }: { status: BookingStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border"
      style={{
        background: config.bg,
        color: config.text,
        borderColor: config.border,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: "currentColor" }}
      />
      {config.label}
    </span>
  );
}
