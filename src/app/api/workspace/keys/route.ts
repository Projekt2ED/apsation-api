import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { issuePlatformApiKey } from "@/lib/platform-api-keys";

type CreateKeyPayload = {
  name?: unknown;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  let body: CreateKeyPayload = {};

  try {
    body = (await request.json()) as CreateKeyPayload;
  } catch {
    body = {};
  }

  try {
    const key = await issuePlatformApiKey(
      user.id,
      typeof body.name === "string" ? body.name : null,
    );

    return NextResponse.json({
      key: {
        id: key.id,
        kind: key.kind,
        name: key.name,
        tokenPreview: key.tokenPreview,
        scope: key.scope,
        status: key.status,
        source: key.source,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
        monthlyUsageCount: 0,
      },
      secret: key.secret,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create API key.";
    const status = message.toLowerCase().includes("duplicate") ? 409 : 400;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
