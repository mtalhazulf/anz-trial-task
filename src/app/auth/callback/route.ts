import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSafeInternalPath } from "@/lib/auth/safe-redirect";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = getSafeInternalPath(searchParams.get("next"));

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, origin).toString());
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin).toString());
}
