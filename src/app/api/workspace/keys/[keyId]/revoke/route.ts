import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { revokePlatformApiKey } from "@/lib/platform-api-keys";

type RouteContext = {
  params: Promise<{
    keyId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  const { keyId } = await context.params;

  try {
    const revoked = await revokePlatformApiKey(user.id, keyId);

    if (!revoked) {
      return NextResponse.json(
        {
          error: "API key not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to revoke API key.",
      },
      { status: 400 },
    );
  }
}
