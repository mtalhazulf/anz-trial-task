import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDashboardAgencyContext } from "@/lib/agency/server";
import BookingTable from "@/components/BookingTable";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const ctx = await getDashboardAgencyContext();
  if (!ctx) {
    redirect("/login");
  }

  if (!ctx.activeAgencyId) {
    return (
      <div className="card p-10 text-center max-w-md mx-auto">
        <h1
          className="text-[16px] font-semibold mb-1.5"
          style={{ color: "var(--color-text)" }}
        >
          No agencies yet
        </h1>
        <p
          className="text-[13px]"
          style={{ color: "var(--color-text-muted)" }}
        >
          Create an agency from the sidebar to get started.
        </p>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("agency_id", ctx.activeAgencyId)
    .order("created_at", { ascending: false });

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-[20px] font-semibold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Bookings
          </h1>
          <p
            className="text-[13px] mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            Manage travel bookings for this agency.
          </p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary">
          <Plus className="w-3.5 h-3.5" />
          New booking
        </Link>
      </div>

      {/* Table */}
      <BookingTable
        initialBookings={bookings ?? []}
        activeAgencyId={ctx.activeAgencyId}
      />
    </div>
  );
}
