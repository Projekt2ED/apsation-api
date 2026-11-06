import "server-only";

import type { UserQuotaStatus } from "@/lib/quota";
import { getUserQuotaStatus } from "@/lib/quota";
import { getSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase-admin";

export type WorkspaceOverview = {
  keyCount: number;
  logCount: number;
  taskCount: number;
  latestLogAt: string | null;
  latestTaskAt: string | null;
  supabaseReady: boolean;
  quota: UserQuotaStatus;
  billing: {
    monthAmount: number;
    currency: string;
  };
};

export type WorkspaceKeyRecord = {
  id: string;
  kind: string;
  name: string;
  tokenPreview: string;
  scope: string;
  status: string;
  source: string;
  lastUsedAt: string | null;
  createdAt: string | null;
  monthlyUsageCount: number;
};

export type WorkspaceLogRecord = {
  id: string;
  createdAt: string;
  modeId: string;
  model: string | null;
  statusCode: number;
  durationMs: number | null;
  summary: string | null;
  errorMessage: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  billableAmount: number | null;
  billingCurrency: string | null;
};

export type WorkspaceTaskRecord = {
  id: string;
  upstreamTaskId: string;
  modeId: string;
  model: string | null;
  promptPreview: string | null;
  status: string;
  note: string | null;
  resultUrl: string | null;
  updatedAt: string;
};

export type PlaygroundRunRecordInput = {
  userId?: string | null;
  modeId: string;
  endpoint: string;
  model: string | null;
  promptPreview: string | null;
  statusCode: number;
  durationMs: number;
  summary?: string | null;
  errorMessage?: string | null;
  upstreamRequestId?: string | null;
  upstreamTaskId?: string | null;
  upstreamResultId?: string | null;
  apiKeyId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cachedInputTokens?: number | null;
  billableAmount?: number | null;
  billingCurrency?: string | null;
  pricingModel?: string | null;
  pricingSnapshot?: Record<string, unknown> | null;
  taskStatus?: string | null;
  resultUrl?: string | null;
  note?: string | null;
};

let cachedApiKeyLogSupport: boolean | undefined;
let cachedBillingLogSupport: boolean | undefined;

function coerceText(value: unknown) {
  return typeof value === "string" && value.trim().length ? value : null;
}

function getCurrentUtcMonthWindow() {
  const now = new Date();
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const windowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
  };
}

async function supportsApiKeyLogColumn() {
  if (cachedApiKeyLogSupport !== undefined) {
    return cachedApiKeyLogSupport;
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    cachedApiKeyLogSupport = false;
    return cachedApiKeyLogSupport;
  }

  const { error } = await client.from("playground_logs").select("api_key_id").limit(1);
  cachedApiKeyLogSupport = !error;
  return cachedApiKeyLogSupport;
}

async function supportsBillingLogColumns() {
  if (cachedBillingLogSupport !== undefined) {
    return cachedBillingLogSupport;
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    cachedBillingLogSupport = false;
    return cachedBillingLogSupport;
  }

  const { error } = await client
    .from("playground_logs")
    .select("input_tokens,output_tokens,billable_amount,billing_currency,pricing_model,pricing_snapshot")
    .limit(1);
  cachedBillingLogSupport = !error;
  return cachedBillingLogSupport;
}

async function getMonthlyKeyUsageCounts(keyIds: string[]) {
  const client = getSupabaseAdminClient();

  if (!client || !keyIds.length || !(await supportsApiKeyLogColumn())) {
    return new Map<string, number>();
  }

  const { windowStart, windowEnd } = getCurrentUtcMonthWindow();
  const counts = await Promise.all(
    keyIds.map(async (keyId) => {
      const { count, error } = await client
        .from("playground_logs")
        .select("id", { count: "exact", head: true })
        .eq("api_key_id", keyId)
        .gte("created_at", windowStart)
        .lt("created_at", windowEnd);

      return [keyId, error ? 0 : count ?? 0] as const;
    }),
  );

  return new Map(counts);
}

async function getMonthlyBillingAmount(userId: string) {
  const client = getSupabaseAdminClient();

  if (!client || !(await supportsBillingLogColumns())) {
    return 0;
  }

  const { windowStart, windowEnd } = getCurrentUtcMonthWindow();
  const { data, error } = await client
    .from("playground_logs")
    .select("billable_amount")
    .eq("user_id", userId)
    .gte("created_at", windowStart)
    .lt("created_at", windowEnd);

  if (error || !data) {
    return 0;
  }

  return data.reduce((sum, item) => {
    const value = item.billable_amount;

    if (typeof value === "number" && Number.isFinite(value)) {
      return sum + value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }

    return sum;
  }, 0);
}

export async function getWorkspaceOverview(userId: string): Promise<WorkspaceOverview> {
  const quota = await getUserQuotaStatus(userId);

  if (!hasSupabaseAdminEnv()) {
    return {
      keyCount: 0,
      logCount: 0,
      taskCount: 0,
      latestLogAt: null,
      latestTaskAt: null,
      supabaseReady: false,
      quota,
      billing: {
        monthAmount: 0,
        currency: "CNY",
      },
    };
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    return {
      keyCount: 0,
      logCount: 0,
      taskCount: 0,
      latestLogAt: null,
      latestTaskAt: null,
      supabaseReady: false,
      quota,
      billing: {
        monthAmount: 0,
        currency: "CNY",
      },
    };
  }

  const [keyData, logData, taskData, latestLog, latestTask, monthAmount] = await Promise.all([
    client
      .from("workspace_api_keys")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("kind", "system"),
    client
      .from("playground_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    client
      .from("async_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    client
      .from("playground_logs")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("async_tasks")
      .select("updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getMonthlyBillingAmount(userId),
  ]);

  return {
    keyCount: keyData.error ? 0 : keyData.count ?? 0,
    logCount: logData.error ? 0 : logData.count ?? 0,
    taskCount: taskData.error ? 0 : taskData.count ?? 0,
    latestLogAt: latestLog.error ? null : coerceText(latestLog.data?.created_at),
    latestTaskAt: latestTask.error ? null : coerceText(latestTask.data?.updated_at),
    supabaseReady: true,
    quota,
    billing: {
      monthAmount,
      currency: "CNY",
    },
  };
}

export async function getWorkspaceKeys(userId: string): Promise<WorkspaceKeyRecord[]> {
  if (!hasSupabaseAdminEnv()) {
    return [];
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("workspace_api_keys")
    .select("id,kind,name,token_preview,scope,status,source,last_used_at,created_at")
    .eq("user_id", userId)
    .neq("kind", "system")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const rows = data.filter((item) => item.kind !== "system");
  const usageCounts = await getMonthlyKeyUsageCounts(rows.map((item) => String(item.id)));

  return rows
    .map((item) => ({
      id: String(item.id),
      kind: String(item.kind ?? "manual"),
      name: String(item.name),
      tokenPreview: String(item.token_preview),
      scope: String(item.scope),
      status: String(item.status),
      source: String(item.source ?? "dashboard"),
      lastUsedAt: coerceText(item.last_used_at),
      createdAt: coerceText(item.created_at),
      monthlyUsageCount: usageCounts.get(String(item.id)) ?? 0,
    }));
}

export async function getWorkspaceLogs(userId: string): Promise<WorkspaceLogRecord[]> {
  const client = getSupabaseAdminClient();

  if (!client) {
    return [];
  }

  const billingColumns = (await supportsBillingLogColumns())
    ? ",input_tokens,output_tokens,billable_amount,billing_currency"
    : "";
  const { data, error } = await client
    .from("playground_logs")
    .select(
      `id,created_at,mode_id,model,status_code,duration_ms,summary,error_message${billingColumns}`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  const rows = data as unknown as Record<string, unknown>[];

  return rows.map((item) => ({
    id: String(item.id),
    createdAt: String(item.created_at),
    modeId: String(item.mode_id),
    model: coerceText(item.model),
    statusCode: Number(item.status_code ?? 0),
    durationMs:
      typeof item.duration_ms === "number"
        ? item.duration_ms
        : item.duration_ms == null
          ? null
          : Number(item.duration_ms),
    summary: coerceText(item.summary),
    errorMessage: coerceText(item.error_message),
    inputTokens:
      typeof item.input_tokens === "number"
        ? item.input_tokens
        : item.input_tokens == null
          ? null
          : Number(item.input_tokens),
    outputTokens:
      typeof item.output_tokens === "number"
        ? item.output_tokens
        : item.output_tokens == null
          ? null
          : Number(item.output_tokens),
    billableAmount:
      typeof item.billable_amount === "number"
        ? item.billable_amount
        : item.billable_amount == null
          ? null
          : Number(item.billable_amount),
    billingCurrency: coerceText(item.billing_currency),
  }));
}

export async function getWorkspaceTasks(userId: string): Promise<WorkspaceTaskRecord[]> {
  const client = getSupabaseAdminClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("async_tasks")
    .select(
      "id,upstream_task_id,mode_id,model,prompt_preview,status,note,result_url,updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  return data.map((item) => ({
    id: String(item.id),
    upstreamTaskId: String(item.upstream_task_id),
    modeId: String(item.mode_id),
    model: coerceText(item.model),
    promptPreview: coerceText(item.prompt_preview),
    status: String(item.status),
    note: coerceText(item.note),
    resultUrl: coerceText(item.result_url),
    updatedAt: String(item.updated_at),
  }));
}

export async function recordPlaygroundRun(input: PlaygroundRunRecordInput) {
  if (!input.userId) {
    return;
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    return;
  }

  const logPayload: Record<string, unknown> = {
    user_id: input.userId,
    mode_id: input.modeId,
    endpoint: input.endpoint,
    model: input.model,
    prompt_preview: input.promptPreview,
    status_code: input.statusCode,
    duration_ms: input.durationMs,
    summary: input.summary ?? null,
    error_message: input.errorMessage ?? null,
    upstream_request_id: input.upstreamRequestId ?? null,
    upstream_task_id: input.upstreamTaskId ?? null,
    upstream_result_id: input.upstreamResultId ?? null,
  };

  if (input.apiKeyId && (await supportsApiKeyLogColumn())) {
    logPayload.api_key_id = input.apiKeyId;
  }

  if (await supportsBillingLogColumns()) {
    logPayload.input_tokens = input.inputTokens ?? null;
    logPayload.output_tokens = input.outputTokens ?? null;
    logPayload.cached_input_tokens = input.cachedInputTokens ?? null;
    logPayload.billable_amount = input.billableAmount ?? null;
    logPayload.billing_currency = input.billingCurrency ?? null;
    logPayload.pricing_model = input.pricingModel ?? null;
    logPayload.pricing_snapshot = input.pricingSnapshot ?? null;
  }

  const logInsert = await client.from("playground_logs").insert(logPayload);

  if (logInsert.error) {
    console.error("Failed to insert playground_logs", logInsert.error.message);
  }

  if (!input.upstreamTaskId) {
    return;
  }

  const taskUpsert = await client.from("async_tasks").upsert(
    {
      user_id: input.userId,
      upstream_task_id: input.upstreamTaskId,
      mode_id: input.modeId,
      model: input.model,
      prompt_preview: input.promptPreview,
      status: input.taskStatus ?? "queued",
      note: input.note ?? input.summary ?? null,
      result_url: input.resultUrl ?? null,
      last_status_code: input.statusCode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "upstream_task_id" },
  );

  if (taskUpsert.error) {
    console.error("Failed to upsert async_tasks", taskUpsert.error.message);
  }
}
