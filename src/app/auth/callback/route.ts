import { NextResponse } from "next/server";

import { appRoutes } from "@/lib/app-routes";
import { normalizeNextPath } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = normalizeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await getSupabaseServerClient();

    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        await getSupabaseAdminClient()
          ?.from("user_billing_accounts")
          .upsert(
            {
              user_id: user.id,
              balance_cny: 0,
              total_recharged_cny: 0,
              status: "active",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id", ignoreDuplicates: true },
          );
      }
    }
  }

  return NextResponse.redirect(new URL(next ?? appRoutes.workspace, url.origin));
}
