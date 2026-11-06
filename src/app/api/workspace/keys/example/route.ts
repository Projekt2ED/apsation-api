import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getLatestActivePlatformApiKeyExample } from "@/lib/platform-api-keys";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  const key = await getLatestActivePlatformApiKeyExample(user.id);

  return NextResponse.json({
    apiKey: null,
    tokenPreview: key?.tokenPreview ?? null,
    hasActiveKey: Boolean(key),
    createdAt: key?.createdAt ?? null,
  });
}
