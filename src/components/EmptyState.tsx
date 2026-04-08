import { CalendarDays } from "lucide-react";
import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div
        className="w-10 h-10 rounded-full grid place-items-center mb-4"
        style={{
          background: "var(--color-bg-muted)",
          color: "var(--color-text-muted)",
        }}
      >
        <CalendarDays className="w-5 h-5" strokeWidth={2} />
      </div>
      <h3
        className="text-[14px] font-semibold mb-1"
        style={{ color: "var(--color-text)" }}
      >
        No bookings yet
      </h3>
      <p
        className="text-[13px] mb-5 max-w-xs"
        style={{ color: "var(--color-text-muted)" }}
      >
        Get started by creating your first booking for this agency.
      </p>
      <Link href="/dashboard/new" className="btn btn-primary">
        Add booking
      </Link>
    </div>
  );
}
