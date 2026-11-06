import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type UserSummary = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
};

type AdminKeyRecord = {
  id: string;
  userId: string | null;
  userLabel: string;
  name: string;
  kind: string;
  tokenPreview: string;
  status: string;
  lastUsedAt: string | null;
  createdAt: string | null;
};

type AdminLogRecord = {
  id: string;
  userId: string | null;
  userLabel: string;
  createdAt: string;
  modeId: string;
  model: string | null;
  statusCode: number;
  durationMs: number | null;
  summary: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  billableAmount: number | null;
  billingCurrency: string | null;
};

type AdminTaskRecord = {
  id: string;
  userId: string | null;
  userLabel: string;
  upstreamTaskId: string;
  modeId: string;
  model: string | null;
  status: string;
  updatedAt: string;
};

type BillingRankingRecord = {
  label: string;
  count: number;
  amount: number;
};

export type AdminDashboardData = {
  ready: boolean;
  counts: {
    users: number;
    keys: number;
    logs: number;
    tasks: number;
  };
  billing: {
    available: boolean;
    monthAmount: number;
    totalAmount: number;
    currency: string;
    billableLogCount: number;
    inputTokens: number;
    outputTokens: number;
  };
  topUsers: BillingRankingRecord[];
  topModels: BillingRankingRecord[];
  users: UserSummary[];
  keys: AdminKeyRecord[];
  logs: AdminLogRecord[];
  tasks: AdminTaskRecord[];
};

let cachedBillingColumnSupport: boolean | undefined;

function coerceText(value: unknown) {
  return typeof value === "string" && value.trim().length ? value : null;
}

function shortUserId(userId?: string | null) {
  if (!userId) {
    return "--";
  }

  return `${userId.slice(0, 8)}...${userId.slice(-4)}`;
}

function buildUserLabelMap(users: UserSummary[]) {
  const map = new Map<string, string>();

  for (const user of users) {
    map.set(user.id, user.email ?? shortUserId(user.id));
  }

  return map;
}

function getUserLabel(userMap: Map<string, string>, userId?: string | null) {
  if (!userId) {
    return "--";
  }

  return userMap.get(userId) ?? shortUserId(userId);
}

function coerceNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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

async function supportsBillingColumns() {
  if (cachedBillingColumnSupport !== undefined) {
    return cachedBillingColumnSupport;
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    cachedBillingColumnSupport = false;
    return cachedBillingColumnSupport;
  }

  const { error } = await client
    .from("playground_logs")
    .select("input_tokens,output_tokens,billable_amount,billing_currency")
    .limit(1);

  cachedBillingColumnSupport = !error;
  return cachedBillingColumnSupport;
}

function summarizeBillingRows(
  rows: Record<string, unknown>[],
  userMap: Map<string, string>,
) {
  let totalAmount = 0;
  let billableLogCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const userTotals = new Map<string, BillingRankingRecord>();
  const modelTotals = new Map<string, BillingRankingRecord>();

  for (const row of rows) {
    const amount = coerceNumber(row.billable_amount) ?? 0;
    const userId = coerceText(row.user_id);
    const model = coerceText(row.model) ?? "--";
    const userLabel = getUserLabel(userMap, userId);

    totalAmount += amount;
    inputTokens += coerceNumber(row.input_tokens) ?? 0;
    outputTokens += coerceNumber(row.output_tokens) ?? 0;

    if (amount > 0) {
      billableLogCount += 1;
    }

    const currentUser = userTotals.get(userLabel) ?? {
      label: userLabel,
      count: 0,
      amount: 0,
    };
    currentUser.count += 1;
    currentUser.amount += amount;
    userTotals.set(userLabel, currentUser);

    const currentModel = modelTotals.get(model) ?? {
      label: model,
      count: 0,
      amount: 0,
    };
    currentModel.count += 1;
    currentModel.amount += amount;
    modelTotals.set(model, currentModel);
  }

  const rank = (records: BillingRankingRecord[]) =>
    records
      .map((record) => ({
        ...record,
        amount: Number(record.amount.toFixed(8)),
      }))
      .sort((left, right) => {
        if (right.amount !== left.amount) {
          return right.amount - left.amount;
        }

        return right.count - left.count;
      })
      .slice(0, 10);

  return {
    totalAmount: Number(totalAmount.toFixed(8)),
    billableLogCount,
    inputTokens,
    outputTokens,
    topUsers: rank([...userTotals.values()]),
    topModels: rank([...modelTotals.values()]),
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const client = getSupabaseAdminClient();

  if (!client) {
    return {
      ready: false,
      counts: {
        users: 0,
        keys: 0,
        logs: 0,
        tasks: 0,
      },
      billing: {
        available: false,
        monthAmount: 0,
        totalAmount: 0,
        currency: "CNY",
        billableLogCount: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
      topUsers: [],
      topModels: [],
      users: [],
      keys: [],
      logs: [],
      tasks: [],
    };
  }

  const hasBillingColumns = await supportsBillingColumns();
  const { windowStart, windowEnd } = getCurrentUtcMonthWindow();
  const logSelect = hasBillingColumns
    ? "id,user_id,created_at,mode_id,model,status_code,duration_ms,summary,error_message,input_tokens,output_tokens,billable_amount,billing_currency"
    : "id,user_id,created_at,mode_id,model,status_code,duration_ms,summary,error_message";
  const billingSelect = hasBillingColumns
    ? "user_id,model,input_tokens,output_tokens,billable_amount,billing_currency,created_at"
    : "id";

  const [
    usersResult,
    keyCount,
    logCount,
    taskCount,
    keyRows,
    logRows,
    taskRows,
    billingRows,
    monthBillingRows,
  ] =
    await Promise.all([
      client.auth.admin.listUsers({ page: 1, perPage: 100 }),
      client
        .from("workspace_api_keys")
        .select("id", { count: "exact", head: true })
        .neq("kind", "system"),
      client.from("playground_logs").select("id", { count: "exact", head: true }),
      client.from("async_tasks").select("id", { count: "exact", head: true }),
      client
        .from("workspace_api_keys")
        .select("id,user_id,kind,name,token_preview,status,last_used_at,created_at")
        .neq("kind", "system")
        .order("created_at", { ascending: false })
        .limit(50),
      client
        .from("playground_logs")
        .select(logSelect)
        .order("created_at", { ascending: false })
        .limit(50),
      client
        .from("async_tasks")
        .select("id,user_id,upstream_task_id,mode_id,model,status,updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      client
        .from("playground_logs")
        .select(billingSelect)
        .order("created_at", { ascending: false })
        .limit(1000),
      client
        .from("playground_logs")
        .select(billingSelect)
        .gte("created_at", windowStart)
        .lt("created_at", windowEnd)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

  const users: UserSummary[] =
    usersResult.data?.users.map((user) => ({
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
    })) ?? [];
  const userMap = buildUserLabelMap(users);
  const billingSummary = hasBillingColumns
    ? summarizeBillingRows(
        (billingRows.data ?? []) as unknown as Record<string, unknown>[],
        userMap,
      )
    : null;
  const monthBillingSummary = hasBillingColumns
    ? summarizeBillingRows(
        (monthBillingRows.data ?? []) as unknown as Record<string, unknown>[],
        userMap,
      )
    : null;

  return {
    ready: true,
    counts: {
      users: users.length,
      keys: keyCount.count ?? 0,
      logs: logCount.count ?? 0,
      tasks: taskCount.count ?? 0,
    },
    billing: {
      available: hasBillingColumns,
      monthAmount: monthBillingSummary?.totalAmount ?? 0,
      totalAmount: billingSummary?.totalAmount ?? 0,
      currency: "CNY",
      billableLogCount: monthBillingSummary?.billableLogCount ?? 0,
      inputTokens: monthBillingSummary?.inputTokens ?? 0,
      outputTokens: monthBillingSummary?.outputTokens ?? 0,
    },
    topUsers: monthBillingSummary?.topUsers ?? [],
    topModels: monthBillingSummary?.topModels ?? [],
    users,
    keys:
      keyRows.data?.map((item) => {
        const userId = coerceText(item.user_id);

        return {
          id: String(item.id),
          userId,
          userLabel: getUserLabel(userMap, userId),
          name: String(item.name),
          kind: String(item.kind),
          tokenPreview: String(item.token_preview),
          status: String(item.status),
          lastUsedAt: coerceText(item.last_used_at),
          createdAt: coerceText(item.created_at),
        };
      }) ?? [],
    logs:
      ((logRows.data ?? []) as unknown as Record<string, unknown>[]).map((item) => {
        const userId = coerceText(item.user_id);

        return {
          id: String(item.id),
          userId,
          userLabel: getUserLabel(userMap, userId),
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
          summary: coerceText(item.error_message) ?? coerceText(item.summary),
          inputTokens: coerceNumber(item.input_tokens),
          outputTokens: coerceNumber(item.output_tokens),
          billableAmount: coerceNumber(item.billable_amount),
          billingCurrency: coerceText(item.billing_currency),
        };
      }) ?? [],
    tasks:
      taskRows.data?.map((item) => {
        const userId = coerceText(item.user_id);

        return {
          id: String(item.id),
          userId,
          userLabel: getUserLabel(userMap, userId),
          upstreamTaskId: String(item.upstream_task_id),
          modeId: String(item.mode_id),
          model: coerceText(item.model),
          status: String(item.status),
          updatedAt: String(item.updated_at),
        };
      }) ?? [],
  };
}
