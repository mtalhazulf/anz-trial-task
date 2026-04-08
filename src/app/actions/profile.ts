"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateProfile(input: {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    return { error: "First and last name are required" as const };
  }
  const fullName = `${firstName} ${lastName}`;

  const meta: Record<string, string | null> = {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
  };
  if (input.avatarUrl !== undefined) {
    meta.avatar_url = input.avatarUrl;
  }

  const { error: authError } = await supabase.auth.updateUser({ data: meta });
  if (authError) return { error: authError.message };

  const { error: dbError } = await supabase
    .from("users")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
    })
    .eq("id", user.id);
  if (dbError) return { error: dbError.message };

  revalidatePath("/dashboard", "layout");
  return { ok: true as const };
}

export async function changePassword(newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters" as const };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { ok: true as const };
}
