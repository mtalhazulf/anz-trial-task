"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { Booking, BookingStatus } from "@/lib/types";
import { updateBooking, deleteBooking } from "@/app/actions/booking";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  booking: Booking | null;
  onClose: () => void;
}

export default function EditBookingModal({ booking, onClose }: Props) {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [activity, setActivity] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<BookingStatus>("pending");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (booking) {
      setClientName(booking.client_name);
      setActivity(booking.activity);
      setTravelDate(booking.travel_date);
      setAmount(String(booking.amount));
      setStatus(booking.status);
    }
  }, [booking]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setSaving(true);
    const result = await updateBooking({
      id: booking.id,
      client_name: clientName,
      activity,
      travel_date: travelDate,
      amount: parseFloat(amount),
      status,
    });
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error ?? "Could not update booking");
      return;
    }
    toast.success("Booking updated");
    onClose();
    router.refresh();
  };

  const handleDelete = async () => {
    if (!booking) return;
    const result = await deleteBooking(booking.id);
    if ("error" in result) {
      toast.error(result.error ?? "Could not delete booking");
      return;
    }
    toast.success("Booking deleted");
    setConfirmDelete(false);
    onClose();
    router.refresh();
  };

  return (
    <>
      <Modal
        open={booking != null}
        onClose={saving ? () => {} : onClose}
        title="Edit booking"
        description={booking ? `Reference ${booking.booking_ref}` : undefined}
        width={520}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn btn-ghost"
              style={{ color: "var(--color-danger)" }}
              disabled={saving}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-booking-form"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </div>
        }
      >
        <form
          id="edit-booking-form"
          onSubmit={handleSave}
          className="space-y-4"
        >
          <div>
            <label htmlFor="edit-client" className="field-label">
              Client name
            </label>
            <input
              id="edit-client"
              type="text"
              className="field"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="edit-activity" className="field-label">
              Activity
            </label>
            <input
              id="edit-activity"
              type="text"
              className="field"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-date" className="field-label">
                Travel date
              </label>
              <input
                id="edit-date"
                type="date"
                className="field"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="edit-amount" className="field-label">
                Amount (USD)
              </label>
              <input
                id="edit-amount"
                type="number"
                className="field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="edit-status" className="field-label">
              Status
            </label>
            <select
              id="edit-status"
              className="field"
              value={status}
              onChange={(e) => setStatus(e.target.value as BookingStatus)}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this booking?"
        description="This permanently removes the booking. This action cannot be undone."
        confirmLabel="Delete booking"
        destructive
      />
    </>
  );
}
