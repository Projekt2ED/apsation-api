import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { appRoutes } from "@/lib/app-routes";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export function normalizeNextPath(input?: string | null) {
  if (!input || !input.startsWith("/")) {
    return appRoutes.workspace;
  }

  return input;
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const client = await getSupabaseServerClient();

  if (!client) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    return null;
  }

  return user;
});

export async function requireCurrentUser(nextPath: string = appRoutes.workspace) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`${appRoutes.login}?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}
