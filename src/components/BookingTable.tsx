"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Booking } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";
import EditBookingModal from "./EditBookingModal";
import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";

export default function BookingTable({
  initialBookings,
  activeAgencyId,
}: {
  initialBookings: Booking[];
  activeAgencyId: string;
}) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [editing, setEditing] = useState<Booking | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  useEffect(() => {
    const agencyFilter = `agency_id=eq.${activeAgencyId}`;
    const channel = supabase
      .channel(`bookings-changes-${activeAgencyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: agencyFilter,
        },
        (payload) => {
          setBookings((prev) => [payload.new as Booking, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: agencyFilter,
        },
        (payload) => {
          const updated = payload.new as Booking;
          setBookings((prev) =>
            prev.map((b) => (b.id === updated.id ? updated : b))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "bookings",
          filter: agencyFilter,
        },
        (payload) => {
          setBookings((prev) => prev.filter((b) => b.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, activeAgencyId]);

  if (bookings.length === 0) {
    return (
      <div className="card overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatDate = (dateStr: string) =>
    format(parseISO(dateStr), "dd MMM yyyy");

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Client</th>
                <th>Activity</th>
                <th>Travel date</th>
                <th>Amount</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="cursor-pointer group"
                  onClick={() => setEditing(booking)}
                >
                  <td>
                    <span
                      className="font-mono text-[12px]"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {booking.booking_ref}
                    </span>
                  </td>
                  <td className="font-medium">{booking.client_name}</td>
                  <td className="text-secondary max-w-[260px] truncate">
                    {booking.activity}
                  </td>
                  <td className="text-secondary">
                    {formatDate(booking.travel_date)}
                  </td>
                  <td className="font-medium tabular-nums">
                    {formatCurrency(booking.amount)}
                  </td>
                  <td>
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="text-right" style={{ width: 40 }}>
                    <span
                      className="inline-flex w-7 h-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: "var(--color-bg-muted)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditBookingModal booking={editing} onClose={() => setEditing(null)} />
    </>
  );
}
