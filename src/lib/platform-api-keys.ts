import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

const HASH_NOTE_PREFIX = "token_hash:";
const PLATFORM_KEY_PREFIX = "aps_live_";

let cachedTokenHashSupport: boolean | undefined;

export type CreatedPlatformApiKey = {
  id: string;
  kind: "issued";
  name: string;
  tokenPreview: string;
  scope: string;
  status: string;
  source: string;
  lastUsedAt: string | null;
  createdAt: string | null;
  secret: string;
};

export type AuthenticatedPlatformApiKey = {
  keyId: string;
  userId: string;
};

export type ActivePlatformApiKeyExample = {
  id: string;
  tokenPreview: string;
  createdAt: string | null;
};

function coerceName(input?: string | null) {
  return input?.trim().slice(0, 48) ?? "";
}

function buildDefaultName() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 15);

  return `API Key ${stamp}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function maskToken(token: string) {
  const trimmed = token.trim();

  if (trimmed.length <= 10) {
    return trimmed;
  }

  return `${trimmed.slice(0, 10)}...${trimmed.slice(-4)}`;
}

function generateSecret() {
  return `${PLATFORM_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

function buildNotes(tokenHash: string) {
  return HASH_NOTE_PREFIX + tokenHash;
}

async function supportsTokenHashColumn() {
  if (cachedTokenHashSupport !== undefined) {
    return cachedTokenHashSupport;
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    cachedTokenHashSupport = false;
    return cachedTokenHashSupport;
  }

  const { error } = await client.from("workspace_api_keys").select("token_hash").limit(1);
  cachedTokenHashSupport = !error;
  return cachedTokenHashSupport;
}

async function buildTokenStoragePayload(tokenHash: string) {
  const payload: Record<string, string> = {
    notes: buildNotes(tokenHash),
  };

  if (await supportsTokenHashColumn()) {
    payload.token_hash = tokenHash;
  }

  return payload;
}

export async function issuePlatformApiKey(userId: string, requestedName?: string | null) {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("Supabase admin configuration is not ready.");
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    throw new Error("Supabase admin client is unavailable.");
  }

  const name = coerceName(requestedName) || buildDefaultName();
  const secret = generateSecret();
  const tokenHash = hashToken(secret);
  const tokenStorage = await buildTokenStoragePayload(tokenHash);

  const { data, error } = await client
    .from("workspace_api_keys")
    .insert({
      user_id: userId,
      kind: "issued",
      name,
      token_preview: maskToken(secret),
      scope: "all",
      status: "active",
      source: "dashboard",
      ...tokenStorage,
    })
    .select("id,kind,name,token_preview,scope,status,source,last_used_at,created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create API key.");
  }

  return {
    id: String(data.id),
    kind: "issued" as const,
    name: String(data.name),
    tokenPreview: String(data.token_preview),
    scope: String(data.scope),
    status: String(data.status),
    source: String(data.source ?? "dashboard"),
    lastUsedAt: typeof data.last_used_at === "string" ? data.last_used_at : null,
    createdAt: typeof data.created_at === "string" ? data.created_at : null,
    secret,
  };
}

export async function revokePlatformApiKey(userId: string, keyId: string) {
  const client = getSupabaseAdminClient();

  if (!client) {
    throw new Error("Supabase admin client is unavailable.");
  }

  const { data, error } = await client
    .from("workspace_api_keys")
    .update({
      status: "revoked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", keyId)
    .eq("user_id", userId)
    .eq("kind", "issued")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

async function findKeyByHashedToken(tokenHash: string) {
  const client = getSupabaseAdminClient();

  if (!client) {
    return null;
  }

  if (await supportsTokenHashColumn()) {
    const byColumn = await client
      .from("workspace_api_keys")
      .select("id,user_id")
      .eq("kind", "issued")
      .eq("status", "active")
      .eq("token_hash", tokenHash)
      .limit(1)
      .maybeSingle();

    if (!byColumn.error && byColumn.data?.id && byColumn.data.user_id) {
      return {
        keyId: String(byColumn.data.id),
        userId: String(byColumn.data.user_id),
      };
    }
  }

  const byNotes = await client
    .from("workspace_api_keys")
    .select("id,user_id")
    .eq("kind", "issued")
    .eq("status", "active")
    .like("notes", `${HASH_NOTE_PREFIX}${tokenHash}%`)
    .limit(1)
    .maybeSingle();

  if (byNotes.error || !byNotes.data?.id || !byNotes.data.user_id) {
    return null;
  }

  return {
    keyId: String(byNotes.data.id),
    userId: String(byNotes.data.user_id),
  };
}

export async function authenticatePlatformApiKey(
  authorizationHeader?: string | null,
): Promise<AuthenticatedPlatformApiKey | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawToken = authorizationHeader.slice("Bearer ".length).trim();

  if (!rawToken.startsWith(PLATFORM_KEY_PREFIX)) {
    return null;
  }

  return findKeyByHashedToken(hashToken(rawToken));
}

export async function getLatestActivePlatformApiKeyExample(
  userId: string,
): Promise<ActivePlatformApiKeyExample | null> {
  const client = getSupabaseAdminClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("workspace_api_keys")
    .select("id,token_preview,created_at")
    .eq("user_id", userId)
    .eq("kind", "issued")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return {
    id: String(data.id),
    tokenPreview: String(data.token_preview),
    createdAt: typeof data.created_at === "string" ? data.created_at : null,
  };
}

export async function touchPlatformApiKeyLastUsed(keyId: string) {
  const client = getSupabaseAdminClient();

  if (!client) {
    return;
  }

  const { error } = await client
    .from("workspace_api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", keyId)
    .eq("kind", "issued");

  if (error) {
    console.error("Failed to touch issued workspace_api_keys", error.message);
  }
}
