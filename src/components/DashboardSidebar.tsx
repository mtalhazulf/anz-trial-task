"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut,
  Plane,
  CalendarDays,
  Plus,
  Menu,
  X,
  ChevronsUpDown,
  Check,
  Trash2,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { Agency } from "@/lib/types";
import {
  setActiveAgency,
  createAgency,
  deleteAgency,
} from "@/app/actions/agency";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import ConfirmDialog from "./ConfirmDialog";
import Modal from "./Modal";

export default function DashboardSidebar({
  agencies,
  activeAgencyId,
  ownedAgencyIds,
}: {
  agencies: Agency[];
  activeAgencyId: string | null;
  ownedAgencyIds: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [pending, startTransition] = useTransition();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agencyMenuOpen, setAgencyMenuOpen] = useState(false);
  const [agencyToDelete, setAgencyToDelete] = useState<Agency | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("voyager.sidebar.collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/dashboard/new");
  }, [router]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("voyager.sidebar.collapsed", next ? "1" : "0");
      } catch {}
      if (next) setAgencyMenuOpen(false);
      return next;
    });
  };

  const switcherRef = useRef<HTMLDivElement>(null);
  useClickOutside(switcherRef, () => setAgencyMenuOpen(false), agencyMenuOpen);

  const ownedSet = new Set(ownedAgencyIds);
  const activeName =
    agencies.find((a) => a.id === activeAgencyId)?.name ?? "No agency";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  const handleAgencyChange = (agencyId: string) => {
    setAgencyMenuOpen(false);
    startTransition(async () => {
      const result = await setActiveAgency(agencyId);
      if ("error" in result) {
        toast.error(result.error ?? "Could not switch agency");
        return;
      }
      router.refresh();
    });
  };

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAgencyName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    const result = await createAgency(name);
    setCreating(false);
    if ("error" in result) {
      toast.error(result.error ?? "Could not create agency");
      return;
    }
    toast.success("Agency created");
    setNewAgencyName("");
    setCreateModalOpen(false);
    setAgencyMenuOpen(false);
    router.refresh();
  };

  const handleDeleteAgency = async () => {
    if (!agencyToDelete) return;
    const result = await deleteAgency(agencyToDelete.id);
    if ("error" in result) {
      toast.error(result.error ?? "Could not delete agency");
      return;
    }
    toast.success("Agency deleted");
    setAgencyToDelete(null);
    setAgencyMenuOpen(false);
    router.refresh();
  };

  const navLinks = [
    { href: "/dashboard", label: "Bookings", icon: CalendarDays },
  ];

  const bookingsNavActive =
    pathname === "/dashboard" || pathname === "/dashboard/new";

  const isCollapsed = collapsed && !mobileOpen;

  const collapseGridStyle = {
    display: "grid",
    gridTemplateColumns: isCollapsed ? "auto 0fr" : "auto minmax(0, 1fr)",
    columnGap: isCollapsed ? "0px" : "8px",
    justifyContent: "center",
    alignItems: "center",
    transition:
      "grid-template-columns 320ms cubic-bezier(0.32, 0.72, 0, 1), column-gap 320ms cubic-bezier(0.32, 0.72, 0, 1)",
  } as const;

  const labelFadeStyle = {
    opacity: isCollapsed ? 0 : 1,
    transform: isCollapsed ? "translateX(-4px)" : "translateX(0)",
    transition:
      "opacity 180ms ease-out, transform 280ms cubic-bezier(0.32, 0.72, 0, 1)",
    pointerEvents: isCollapsed ? ("none" as const) : undefined,
  };

  const handleAsideClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!isCollapsed) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, [role='button']"))
      return;
    toggleCollapsed();
  };

  const sidebarInner = (
    <>
      <div className="h-14 border-b divider px-2" style={collapseGridStyle}>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="group relative w-8 h-8 grid place-items-center rounded-md transition-colors hover:bg-(--color-bg-hover) shrink-0"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span
            className={`w-7 h-7 rounded-md grid place-items-center shrink-0 transition-opacity ${
              isCollapsed ? "group-hover:opacity-0" : ""
            }`}
            style={{ background: "var(--color-accent)" }}
          >
            <Plane className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </span>
          {isCollapsed && (
            <PanelLeftOpen
              className="w-4 h-4 absolute opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-text-secondary)" }}
            />
          )}
        </button>
        <div
          className="min-w-0 overflow-hidden flex items-center gap-2"
          style={labelFadeStyle}
        >
          <div className="min-w-0 flex-1">
            <p
              className="text-[14px] font-semibold tracking-tight leading-tight whitespace-nowrap"
              style={{ color: "var(--color-text)" }}
            >
              Voyager
            </p>
            <p className="text-[10.5px] leading-tight text-muted whitespace-nowrap">
              Agency Booking Portal
            </p>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden md:inline-flex w-7 h-7 items-center justify-center rounded-md transition-colors hover:bg-(--color-bg-hover) shrink-0"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            tabIndex={isCollapsed ? -1 : 0}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative px-2 pt-3 pb-2" ref={switcherRef}>
        <button
          type="button"
          onClick={() => setAgencyMenuOpen((v) => !v)}
          disabled={pending}
          className="w-full px-1 py-2 rounded-md text-left transition-colors hover:bg-(--color-bg-hover) focus-ring"
          style={collapseGridStyle}
          aria-label={isCollapsed ? activeName : undefined}
          title={isCollapsed ? activeName : undefined}
        >
          <div
            className="w-7 h-7 rounded-md grid place-items-center shrink-0"
            style={{
              background: "var(--color-accent-soft)",
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent-soft-border)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {activeName.charAt(0).toUpperCase()}
          </div>
          <div
            className="min-w-0 overflow-hidden flex items-center gap-2"
            style={labelFadeStyle}
          >
            <div className="min-w-0 flex-1">
              <p
                className="text-[13px] font-semibold truncate"
                style={{ color: "var(--color-text)" }}
              >
                {activeName}
              </p>
              <p className="text-[11px] text-muted truncate">Travel agency</p>
            </div>
            <ChevronsUpDown
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: "var(--color-text-subtle)" }}
            />
          </div>
        </button>

        {agencyMenuOpen && (
          <div
            className={`absolute top-full mt-1 card overflow-hidden z-30 animate-up ${
              isCollapsed ? "left-2 w-[240px]" : "left-3 right-3"
            }`}
            style={{
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 12px 36px -8px rgba(0,0,0,0.22)",
            }}
          >
            {agencies.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-[11px] font-medium text-muted">
                  Workspaces
                </div>
                <div className="border-t divider" />
                <div className="py-1 max-h-64 overflow-y-auto">
                  {agencies.map((a) => {
                    const active = a.id === activeAgencyId;
                    const isOwner = ownedSet.has(a.id);
                    return (
                      <div
                        key={a.id}
                        className="group flex items-center gap-1 px-1.5 py-0.5"
                      >
                        <button
                          type="button"
                          onClick={() => handleAgencyChange(a.id)}
                          className="flex-1 flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-[13px] transition-colors hover:bg-(--color-bg-hover)"
                          style={{ color: "var(--color-text)" }}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-5 h-5 rounded grid place-items-center text-[10px] font-semibold shrink-0"
                              style={{
                                background: "var(--color-accent-soft)",
                                color: "var(--color-accent)",
                                border:
                                  "1px solid var(--color-accent-soft-border)",
                              }}
                            >
                              {a.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate">{a.name}</span>
                          </span>
                          {active && (
                            <Check
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: "var(--color-accent)" }}
                            />
                          )}
                        </button>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAgencyToDelete(a);
                            }}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded transition-all"
                            style={{ color: "var(--color-text-subtle)" }}
                            aria-label={`Delete ${a.name}`}
                            title="Delete agency"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color =
                                "var(--color-danger)";
                              e.currentTarget.style.background =
                                "var(--color-danger-bg)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color =
                                "var(--color-text-subtle)";
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t divider" />
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setAgencyMenuOpen(false);
                setCreateModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors hover:bg-(--color-bg-hover)"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <Plus
                className="w-3.5 h-3.5"
                style={{ color: "var(--color-text-muted)" }}
              />
              Create new agency
            </button>
          </div>
        )}
      </div>

      <div className="border-t divider mx-2" />

      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden px-2">
        <p
          className="px-2 mb-1 text-[11px] font-medium uppercase tracking-wider text-muted whitespace-nowrap"
          style={{
            opacity: isCollapsed ? 0 : 1,
            height: isCollapsed ? 0 : undefined,
            marginBottom: isCollapsed ? 0 : undefined,
            transition:
              "opacity 180ms ease-out, height 240ms ease-out, margin-bottom 240ms ease-out",
            overflow: "hidden",
          }}
        >
          Workspace
        </p>
        <div className="space-y-0.5">
          {navLinks.map((link) => {
            const active = bookingsNavActive;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap overflow-hidden"
                style={{
                  ...collapseGridStyle,
                  color: active
                    ? "var(--color-text)"
                    : "var(--color-text-secondary)",
                  background: active ? "var(--color-bg-hover)" : "transparent",
                }}
                aria-label={isCollapsed ? link.label : undefined}
                title={isCollapsed ? link.label : undefined}
              >
                <link.icon
                  className="w-4 h-4 shrink-0"
                  strokeWidth={2}
                  style={{
                    color: active
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                  }}
                />
                <span className="overflow-hidden" style={labelFadeStyle}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="py-3 border-t divider px-2">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors hover:bg-(--color-bg-hover) whitespace-nowrap overflow-hidden"
          style={{
            ...collapseGridStyle,
            color: "var(--color-text-secondary)",
          }}
          aria-label={isCollapsed ? "Sign out" : undefined}
          title={isCollapsed ? "Sign out" : undefined}
        >
          <LogOut
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          />
          <span className="overflow-hidden" style={labelFadeStyle}>
            Sign out
          </span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-12 border-b divider"
        style={{ background: "var(--color-bg)" }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="btn btn-ghost btn-sm px-2!"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-5 h-5 rounded grid place-items-center shrink-0"
            style={{ background: "var(--color-accent)" }}
          >
            <Plane className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-[13px] font-semibold truncate"
            style={{ color: "var(--color-text)" }}
          >
            {activeName}
          </span>
        </div>
      </div>

      <button
        type="button"
        aria-label="Close menu"
        tabIndex={mobileOpen ? 0 : -1}
        aria-hidden={!mobileOpen}
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ease-out ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{
          background: "rgba(9, 9, 11, 0.45)",
          backdropFilter: "blur(2px)",
        }}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        onClick={handleAsideClick}
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col min-h-screen
          md:shrink-0 md:min-w-0
          border-r divider overflow-x-hidden
          ${isCollapsed ? "cursor-pointer" : ""}
        `}
        style={{
          background: "var(--color-bg)",
          willChange: "transform, width",
          width: isDesktop ? (isCollapsed ? 48 : 240) : 280,
          transform: isDesktop
            ? "translateX(0)"
            : mobileOpen
              ? "translateX(0)"
              : "translateX(-105%)",
          transition:
            "transform 360ms cubic-bezier(0.32, 0.72, 0, 1), width 320ms cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow:
            mobileOpen && !isDesktop
              ? "0 0 60px -10px rgba(0,0,0,0.25)"
              : undefined,
        }}
      >
        <div className="md:hidden flex justify-end p-2 border-b divider">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="btn btn-ghost btn-sm px-2!"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col flex-1 min-h-0">{sidebarInner}</div>
      </aside>

      <ConfirmDialog
        open={agencyToDelete != null}
        onClose={() => setAgencyToDelete(null)}
        onConfirm={handleDeleteAgency}
        title={`Delete "${agencyToDelete?.name}"?`}
        description="This permanently removes the agency and all of its bookings. This action cannot be undone."
        confirmLabel="Delete agency"
        destructive
      />

      <Modal
        open={createModalOpen}
        onClose={() => {
          if (!creating) {
            setCreateModalOpen(false);
            setNewAgencyName("");
          }
        }}
        title="Create new agency"
        description="Add a new workspace to manage its own bookings."
        width={420}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setCreateModalOpen(false);
                setNewAgencyName("");
              }}
              disabled={creating}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-agency-form"
              disabled={creating}
              className="btn btn-primary"
            >
              {creating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create agency"
              )}
            </button>
          </>
        }
      >
        <form id="create-agency-form" onSubmit={handleCreateAgency}>
          <label htmlFor="new-agency-name" className="field-label">
            Agency name
          </label>
          <input
            id="new-agency-name"
            type="text"
            value={newAgencyName}
            onChange={(e) => setNewAgencyName(e.target.value)}
            placeholder="e.g. Acme Travel Co."
            className="field"
            autoFocus
            required
          />
          <p className="field-hint">
            You&apos;ll be added as the owner of this workspace.
          </p>
        </form>
      </Modal>
    </>
  );
}
