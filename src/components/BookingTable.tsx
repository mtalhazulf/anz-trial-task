"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Booking } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";
import EditBookingModal from "./EditBookingModal";
import { format, parseISO } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Search,
  X,
} from "lucide-react";

const PAGE_SIZE = 10;

const PARAM = {
  q: "q",
  status: "status",
  sort: "sort",
  dir: "dir",
  page: "page",
} as const;

type SortField =
  | "booking_ref"
  | "client_name"
  | "activity"
  | "travel_date"
  | "amount"
  | "status";

type SortDir = "asc" | "desc";

const SORTABLE_FIELDS: ReadonlySet<SortField> = new Set([
  "booking_ref",
  "client_name",
  "activity",
  "travel_date",
  "amount",
  "status",
]);

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const STATUS_RANK: Record<Booking["status"], number> = {
  pending: 0,
  confirmed: 1,
  cancelled: 2,
};

export default function BookingTable({
  initialBookings,
  activeAgencyId,
}: {
  initialBookings: Booking[];
  activeAgencyId: string;
}) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [editing, setEditing] = useState<Booking | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // ---------- URL-derived state ----------
  const urlQ = searchParams.get(PARAM.q) ?? "";
  const urlStatus = searchParams.get(PARAM.status) ?? "";
  const urlSortRaw = searchParams.get(PARAM.sort) ?? "";
  const urlDirRaw = searchParams.get(PARAM.dir) ?? "";
  const sortField: SortField | null = SORTABLE_FIELDS.has(
    urlSortRaw as SortField
  )
    ? (urlSortRaw as SortField)
    : null;
  const sortDir: SortDir = urlDirRaw === "asc" ? "asc" : "desc";
  const rawPage = Number(searchParams.get(PARAM.page));
  const urlPage =
    Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  // Local input mirrors the URL but updates instantly for responsive typing.
  // It is debounced into the URL by the effect below.
  const [searchInput, setSearchInput] = useState(urlQ);

  // ---------- URL helpers ----------
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  const goToPage = useCallback(
    (next: number) => {
      updateParams({ [PARAM.page]: next <= 1 ? null : String(next) });
    },
    [updateParams]
  );

  const setStatus = useCallback(
    (next: string) => {
      // Changing the status filter should always return to page 1.
      updateParams({
        [PARAM.status]: next || null,
        [PARAM.page]: null,
      });
    },
    [updateParams]
  );

  const toggleSort = useCallback(
    (field: SortField) => {
      // Cycle: unsorted → asc → desc → unsorted (default created_at desc).
      let nextSort: string | null = field;
      let nextDir: string | null = "asc";
      if (sortField === field) {
        if (sortDir === "asc") {
          nextDir = "desc";
        } else {
          nextSort = null;
          nextDir = null;
        }
      }
      updateParams({
        [PARAM.sort]: nextSort,
        [PARAM.dir]: nextDir,
        [PARAM.page]: null,
      });
    },
    [sortField, sortDir, updateParams]
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    updateParams({
      [PARAM.q]: null,
      [PARAM.status]: null,
      [PARAM.page]: null,
    });
  }, [updateParams]);

  // ---------- Effects ----------

  useEffect(() => {
    router.prefetch("/dashboard/new");
  }, [router]);

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  // Reset everything to a clean URL when the active agency changes.
  useEffect(() => {
    if (
      searchParams.get(PARAM.page) ||
      searchParams.get(PARAM.q) ||
      searchParams.get(PARAM.status) ||
      searchParams.get(PARAM.sort) ||
      searchParams.get(PARAM.dir)
    ) {
      setSearchInput("");
      router.replace(pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgencyId]);

  // Sync local search input when the URL changes from outside the input
  // (e.g. browser back/forward, clear-filters button).
  useEffect(() => {
    setSearchInput(urlQ);
  }, [urlQ]);

  // Debounce search input → URL.
  useEffect(() => {
    if (searchInput === urlQ) return;
    const timer = setTimeout(() => {
      updateParams({
        [PARAM.q]: searchInput.trim() || null,
        [PARAM.page]: null,
      });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Realtime subscription for the active agency's bookings.
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

  // ---------- Derived data: filter → sort → paginate ----------

  const filteredSorted = useMemo(() => {
    const needle = urlQ.trim().toLowerCase();
    let result = bookings;

    if (urlStatus) {
      result = result.filter((b) => b.status === urlStatus);
    }

    if (needle) {
      result = result.filter(
        (b) =>
          b.booking_ref.toLowerCase().includes(needle) ||
          b.client_name.toLowerCase().includes(needle) ||
          b.activity.toLowerCase().includes(needle)
      );
    }

    // Always create a fresh array before sorting so we never mutate state.
    result = [...result];

    if (sortField) {
      const factor = sortDir === "asc" ? 1 : -1;
      result.sort((a, b) => {
        switch (sortField) {
          case "amount":
            return (a.amount - b.amount) * factor;
          case "travel_date":
            // ISO date strings sort lexicographically.
            return a.travel_date.localeCompare(b.travel_date) * factor;
          case "status":
            return (STATUS_RANK[a.status] - STATUS_RANK[b.status]) * factor;
          default:
            return (
              a[sortField].localeCompare(b[sortField], undefined, {
                sensitivity: "base",
              }) * factor
            );
        }
      });
    } else {
      // Default ordering = newest first (matches the original behavior).
      result.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    return result;
  }, [bookings, urlQ, urlStatus, sortField, sortDir]);

  const totalFiltered = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(urlPage, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const pageBookings = filteredSorted.slice(startIdx, endIdx);
  const rangeStart = totalFiltered === 0 ? 0 : startIdx + 1;
  const rangeEnd = startIdx + pageBookings.length;

  // Normalize URL when current page falls past the last page.
  useEffect(() => {
    if (urlPage > totalPages) {
      goToPage(totalPages);
    }
  }, [urlPage, totalPages, goToPage]);

  // ---------- Render guards ----------

  if (bookings.length === 0) {
    return (
      <div className="card overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  // ---------- Helpers ----------

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatDate = (dateStr: string) =>
    format(parseISO(dateStr), "dd MMM yyyy");

  const hasActiveFilters = Boolean(urlQ || urlStatus);

  const SortableHeader = ({
    field,
    label,
    align = "left",
  }: {
    field: SortField;
    label: string;
    align?: "left" | "right";
  }) => {
    const active = sortField === field;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th>
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className={`inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wider transition-colors hover:text-text ${
            align === "right" ? "flex-row-reverse" : ""
          }`}
          style={{
            color: active
              ? "var(--color-text)"
              : "var(--color-text-muted)",
          }}
          aria-label={`Sort by ${label}`}
        >
          {label}
          <Icon
            className="w-3 h-3"
            style={{
              color: active
                ? "var(--color-accent)"
                : "var(--color-text-subtle)",
            }}
          />
        </button>
      </th>
    );
  };

  return (
    <>
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-3 border-b divider"
          style={{ background: "var(--color-bg)" }}
        >
          <div className="relative flex-1 min-w-[180px] max-w-[360px]">
            <Search
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--color-text-subtle)" }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search booking, client, activity…"
              className="field h-8! pl-7! pr-7! text-[13px]!"
              aria-label="Search bookings"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 grid place-items-center rounded transition-colors hover:bg-(--color-bg-hover)"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={urlStatus}
            onChange={(e) => setStatus(e.target.value)}
            className="field h-8! text-[13px]! w-auto!"
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-[12px] font-medium transition-colors hover:bg-(--color-bg-hover)"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <SortableHeader field="booking_ref" label="Booking" />
                <SortableHeader field="client_name" label="Client" />
                <SortableHeader field="activity" label="Activity" />
                <SortableHeader field="travel_date" label="Travel date" />
                <SortableHeader field="amount" label="Amount" />
                <SortableHeader field="status" label="Status" />
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {pageBookings.map((booking) => (
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
              {pageBookings.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="py-12 text-center">
                      <p
                        className="text-[13px] font-medium"
                        style={{ color: "var(--color-text)" }}
                      >
                        No bookings match your filters
                      </p>
                      <p
                        className="text-[12px] mt-1"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Try a different search or clear the filters.
                      </p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="btn btn-secondary btn-sm mt-3"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 border-t divider"
          style={{ background: "var(--color-bg)" }}
        >
          <p
            className="text-[12px] tabular-nums"
            style={{ color: "var(--color-text-muted)" }}
          >
            Showing{" "}
            <span style={{ color: "var(--color-text-secondary)" }}>
              {rangeStart}–{rangeEnd}
            </span>{" "}
            of{" "}
            <span style={{ color: "var(--color-text-secondary)" }}>
              {totalFiltered}
            </span>
            {hasActiveFilters && bookings.length !== totalFiltered && (
              <span style={{ color: "var(--color-text-subtle)" }}>
                {" "}
                (filtered from {bookings.length})
              </span>
            )}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium transition-colors hover:bg-(--color-bg-hover) disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              style={{ color: "var(--color-text-secondary)" }}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span
              className="px-2 text-[12px] tabular-nums"
              style={{ color: "var(--color-text-muted)" }}
            >
              Page{" "}
              <span style={{ color: "var(--color-text-secondary)" }}>
                {currentPage}
              </span>{" "}
              of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium transition-colors hover:bg-(--color-bg-hover) disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              style={{ color: "var(--color-text-secondary)" }}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <EditBookingModal booking={editing} onClose={() => setEditing(null)} />
    </>
  );
}
