import { NextResponse } from "next/server";

import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

type RegisterPayload = {
  email?: unknown;
  password?: unknown;
};

function coerceText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      {
        error: "Supabase admin configuration is not ready.",
      },
      { status: 503 },
    );
  }

  let body: RegisterPayload;

  try {
    body = (await request.json()) as RegisterPayload;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const email = coerceText(body.email).toLowerCase();
  const password = coerceText(body.password);

  if (!isValidEmail(email)) {
    return NextResponse.json(
      {
        error: "Please enter a valid email address.",
      },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      {
        error: "Password must be at least 6 characters.",
      },
      { status: 400 },
    );
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    return NextResponse.json(
      {
        error: "Supabase admin client is unavailable.",
      },
      { status: 503 },
    );
  }

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const lowered = error.message.toLowerCase();
    const status =
      lowered.includes("already") || lowered.includes("exists") ? 409 : 400;

    return NextResponse.json(
      {
        error: error.message,
      },
      { status },
    );
  }

  if (data.user?.id) {
    await client.from("user_billing_accounts").upsert(
      {
        user_id: data.user.id,
        balance_cny: 0,
        total_recharged_cny: 0,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
