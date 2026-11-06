"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient:
  | SupabaseClient
  | null
  | undefined;

export function createSupabaseBrowserClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

  return cachedClient;
}
