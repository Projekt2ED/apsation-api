import "server-only";

import type { User } from "@supabase/supabase-js";

function parseAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: User | null) {
  const email = user?.email?.trim().toLowerCase();

  if (!email) {
    return false;
  }

  return parseAdminEmails().includes(email);
}
