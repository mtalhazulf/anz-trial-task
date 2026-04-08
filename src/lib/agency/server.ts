import { cache } from "react";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Agency } from "@/lib/types";
import { ACTIVE_AGENCY_COOKIE } from "./constants";

export interface DashboardProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export const getDashboardAgencyContext = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows, error } = await supabase
    .from("agency_members")
    .select("created_at, role, agencies(id, name, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("agency_members:", error.message);
  }

  const memberships = (rows ?? [])
    .map((r) => {
      const nested = r.agencies as unknown;
      let agency: Agency | null = null;
      if (nested != null) {
        if (Array.isArray(nested)) {
          const first = nested[0];
          agency =
            first && typeof first === "object" && "id" in first
              ? (first as Agency)
              : null;
        } else {
          agency = nested as Agency;
        }
      }
      if (!agency) return null;
      return {
        agency,
        role: (r as { role?: string }).role ?? "member",
      };
    })
    .filter((m): m is { agency: Agency; role: string } => m != null);

  const agencies: Agency[] = memberships.map((m) => m.agency);
  const ownedAgencyIds = new Set(
    memberships.filter((m) => m.role === "owner").map((m) => m.agency.id)
  );

  const cookieStore = await cookies();
  let activeId = cookieStore.get(ACTIVE_AGENCY_COOKIE)?.value ?? null;
  const memberIds = new Set(agencies.map((a) => a.id));
  if (!activeId || !memberIds.has(activeId)) {
    activeId = agencies[0]?.id ?? null;
  }

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const profile: DashboardProfile = {
    id: user.id,
    email: user.email ?? "",
    first_name: meta.first_name ?? null,
    last_name: meta.last_name ?? null,
    full_name:
      meta.full_name ??
      [meta.first_name, meta.last_name].filter(Boolean).join(" ") ??
      null,
    avatar_url: meta.avatar_url ?? null,
  };

  return {
    user,
    profile,
    agencies,
    activeAgencyId: activeId,
    ownedAgencyIds: Array.from(ownedAgencyIds),
  };
});
