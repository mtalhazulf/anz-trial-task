"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ACTIVE_AGENCY_COOKIE } from "@/lib/agency/constants";

export async function setActiveAgency(agencyId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { data } = await supabase
    .from("agency_members")
    .select("agency_id")
    .eq("user_id", user.id)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (!data) return { error: "Forbidden" as const };

  const store = await cookies();
  store.set(ACTIVE_AGENCY_COOKIE, agencyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/dashboard", "layout");
  return { ok: true as const };
}

export async function createAgency(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required" as const };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { data, error } = await supabase.rpc("create_agency_for_user", {
    p_name: trimmed,
  });

  if (error) return { error: error.message };

  const agencyId = data as string;

  const store = await cookies();
  store.set(ACTIVE_AGENCY_COOKIE, agencyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/dashboard", "layout");
  return { ok: true as const, agencyId };
}

export async function deleteAgency(agencyId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { error } = await supabase.rpc("delete_agency_for_user", {
    p_agency_id: agencyId,
  });

  if (error) return { error: error.message };

  const store = await cookies();
  if (store.get(ACTIVE_AGENCY_COOKIE)?.value === agencyId) {
    store.delete(ACTIVE_AGENCY_COOKIE);
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true as const };
}
