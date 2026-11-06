import "server-only";

import { buildApiErrorPayload } from "@/lib/api-errors";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const DEFAULT_ACCOUNT_BALANCE_CNY = 0;

export type UserQuotaStatus = {
  available: boolean;
  limit: number;
  used: number;
  remaining: number;
  currency: "CNY";
  windowStart: string;
  windowEnd: string;
  resetAt: string;
};

let cachedBillingColumnSupport: boolean | undefined;
let cachedBillingAccountSupport: boolean | undefined;

function getDefaultAccountBalance() {
  const raw = process.env.DEFAULT_ACCOUNT_BALANCE_CNY?.trim();
  const parsed = raw ? Number(raw) : DEFAULT_ACCOUNT_BALANCE_CNY;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_ACCOUNT_BALANCE_CNY;
  }

  return Number(parsed.toFixed(8));
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

async function supportsBillingColumn() {
  if (cachedBillingColumnSupport !== undefined) {
    return cachedBillingColumnSupport;
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    cachedBillingColumnSupport = false;
    return cachedBillingColumnSupport;
  }

  const { error } = await client.from("playground_logs").select("billable_amount").limit(1);
  cachedBillingColumnSupport = !error;
  return cachedBillingColumnSupport;
}

async function supportsBillingAccountTable() {
  if (cachedBillingAccountSupport !== undefined) {
    return cachedBillingAccountSupport;
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    cachedBillingAccountSupport = false;
    return cachedBillingAccountSupport;
  }

  const { error } = await client.from("user_billing_accounts").select("balance_cny").limit(1);
  cachedBillingAccountSupport = !error;
  return cachedBillingAccountSupport;
}

async function getUserAccountBalance(userId: string) {
  const fallbackBalance = getDefaultAccountBalance();
  const client = getSupabaseAdminClient();

  if (!client || !(await supportsBillingAccountTable())) {
    return fallbackBalance;
  }

  const { data, error } = await client
    .from("user_billing_accounts")
    .select("balance_cny,status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || data?.status === "disabled") {
    return 0;
  }

  const balance = data?.balance_cny;

  if (typeof balance === "number" && Number.isFinite(balance)) {
    return Number(balance.toFixed(8));
  }

  if (typeof balance === "string") {
    const parsed = Number(balance);

    return Number.isFinite(parsed) ? Number(parsed.toFixed(8)) : fallbackBalance;
  }

  return fallbackBalance;
}

export async function getUserQuotaStatus(userId: string): Promise<UserQuotaStatus> {
  const limit = await getUserAccountBalance(userId);
  const { windowStart, windowEnd } = getCurrentUtcMonthWindow();
  const client = getSupabaseAdminClient();

  if (!client) {
    return {
      available: false,
      limit,
      used: 0,
      remaining: limit,
      currency: "CNY",
      windowStart,
      windowEnd,
      resetAt: windowEnd,
    };
  }

  if (!(await supportsBillingColumn())) {
    return {
      available: true,
      limit,
      used: 0,
      remaining: limit,
      currency: "CNY",
      windowStart,
      windowEnd,
      resetAt: windowEnd,
    };
  }

  const { data, error } = await client
    .from("playground_logs")
    .select("billable_amount")
    .eq("user_id", userId)
    .gte("created_at", windowStart)
    .lt("created_at", windowEnd);

  if (error || !data) {
    return {
      available: false,
      limit,
      used: 0,
      remaining: limit,
      currency: "CNY",
      windowStart,
      windowEnd,
      resetAt: windowEnd,
    };
  }

  const used = data.reduce((sum, item) => {
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
  const roundedUsed = Number(used.toFixed(8));

  return {
    available: true,
    limit,
    used: roundedUsed,
    remaining: Math.max(0, Number((limit - roundedUsed).toFixed(8))),
    currency: "CNY",
    windowStart,
    windowEnd,
    resetAt: windowEnd,
  };
}

export async function ensureUserQuota(userId: string) {
  const quota = await getUserQuotaStatus(userId);

  if (!quota.available) {
    return {
      allowed: false,
      quota,
      status: 503,
      message: "Quota service is not available.",
    };
  }

  if (quota.used >= quota.limit) {
    return {
      allowed: false,
      quota,
      status: 429,
      message: "Monthly billing quota exceeded.",
    };
  }

  return {
    allowed: true,
    quota,
    status: 200,
    message: null,
  };
}

export function buildQuotaResponsePayload(message: string, quota: UserQuotaStatus) {
  return buildApiErrorPayload({
    code:
      message === "Monthly billing quota exceeded."
        ? "monthly_quota_exceeded"
        : "quota_unavailable",
    message,
    status: message === "Monthly billing quota exceeded." ? 429 : 503,
    meta: {
      quota: {
        limit: quota.limit,
        used: quota.used,
        remaining: quota.remaining,
        currency: quota.currency,
        resetAt: quota.resetAt,
      },
    },
  });
}

export function buildQuotaMeta(quota: UserQuotaStatus) {
  return {
    quota: {
      limit: quota.limit,
      used: quota.used,
      remaining: quota.remaining,
      currency: quota.currency,
      resetAt: quota.resetAt,
    },
  };
}
