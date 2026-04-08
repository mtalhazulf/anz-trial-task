"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { BookingStatus } from "@/lib/types";
import { useOptionalActiveAgencyId } from "@/components/AgencyShell";

export default function BookingForm() {
  const agencyId = useOptionalActiveAgencyId();
  const [clientName, setClientName] = useState("");
  const [activity, setActivity] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<BookingStatus>("pending");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!agencyId) {
        throw new Error("No agency selected. Create or select an agency first.");
      }

      const bookingRef = `BK-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from("bookings").insert({
        agency_id: agencyId,
        booking_ref: bookingRef,
        client_name: clientName,
        activity: activity,
        travel_date: travelDate,
        amount: parseFloat(amount),
        status: status,
      });

      if (error) throw error;

      toast.success("Booking created");
      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create booking";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  if (!agencyId) {
    return (
      <p className="text-[13px] text-muted">
        Select or create an agency in the sidebar to add a booking.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="clientName" className="field-label">
          Client name
        </label>
        <input
          id="clientName"
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="e.g. John Smith"
          className="field"
          required
        />
      </div>

      <div>
        <label htmlFor="activity" className="field-label">
          Activity
        </label>
        <input
          id="activity"
          type="text"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="e.g. Great Barrier Reef Snorkeling"
          className="field"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="travelDate" className="field-label">
            Travel date
          </label>
          <input
            id="travelDate"
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            min={today}
            className="field"
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="field-label">
            Amount (USD)
          </label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="field"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="status" className="field-label">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as BookingStatus)}
          className="field"
        >
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            "Create booking"
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
