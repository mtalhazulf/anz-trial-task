"use client";

import { createContext, useContext } from "react";
import type { Agency } from "@/lib/types";
import type { DashboardProfile } from "@/lib/agency/server";
import DashboardSidebar from "./DashboardSidebar";
import ProfileMenu from "./ProfileMenu";

const ActiveAgencyContext = createContext<string | null>(null);

export function useOptionalActiveAgencyId() {
  return useContext(ActiveAgencyContext);
}

export function useActiveAgencyId() {
  const id = useContext(ActiveAgencyContext);
  if (!id) {
    throw new Error("useActiveAgencyId requires an active agency");
  }
  return id;
}

export default function AgencyShell({
  children,
  agencies,
  activeAgencyId,
  ownedAgencyIds,
  profile,
}: {
  children: React.ReactNode;
  agencies: Agency[];
  activeAgencyId: string | null;
  ownedAgencyIds: string[];
  profile: DashboardProfile;
}) {
  return (
    <ActiveAgencyContext.Provider value={activeAgencyId}>
      <div
        className="min-h-screen flex"
        style={{ background: "var(--color-bg-subtle)" }}
      >
        <DashboardSidebar
          agencies={agencies}
          activeAgencyId={activeAgencyId}
          ownedAgencyIds={ownedAgencyIds}
        />

        <div className="flex-1 min-w-0 flex flex-col pt-12 md:pt-0">
          <header
            className="hidden md:flex sticky top-0 z-20 h-14 items-center justify-end px-6 lg:px-10 border-b divider"
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
            }}
          >
            <ProfileMenu profile={profile} />
          </header>

          {/* Mobile profile menu floats top-right of mobile bar */}
          <div className="md:hidden fixed top-0 right-0 z-40 h-12 flex items-center pr-3">
            <ProfileMenu profile={profile} />
          </div>

          <main className="flex-1 min-w-0">
            <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ActiveAgencyContext.Provider>
  );
}
