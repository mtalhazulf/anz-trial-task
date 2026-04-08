"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";

export async function updateBooking(input: {
  id: string;
  client_name: string;
  activity: string;
  travel_date: string;
  amount: number;
  status: BookingStatus;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { error } = await supabase
    .from("bookings")
    .update({
      client_name: input.client_name,
      activity: input.activity,
      travel_date: input.travel_date,
      amount: input.amount,
      status: input.status,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteBooking(id: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true as const };
}
