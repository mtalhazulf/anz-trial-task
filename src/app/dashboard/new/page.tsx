import { redirect } from "next/navigation";
import BookingForm from "@/components/BookingForm";
import { getDashboardAgencyContext } from "@/lib/agency/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewBookingPage() {
  const ctx = await getDashboardAgencyContext();
  if (!ctx) {
    redirect("/login");
  }
  if (!ctx.activeAgencyId) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-4 transition-colors"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to bookings
        </Link>
        <h1
          className="text-[20px] font-semibold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          New booking
        </h1>
        <p
          className="text-[13px] mt-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          Create a new travel booking for this agency.
        </p>
      </div>

      <div className="card p-6">
        <BookingForm />
      </div>
    </div>
  );
}
