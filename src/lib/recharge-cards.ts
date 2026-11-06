import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const CARD_PREFIX = "APS";

function hashCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function maskCode(code: string) {
  const normalized = code.trim().toUpperCase();

  return `${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
}

export function generateRechargeCode() {
  return `${CARD_PREFIX}-${randomBytes(18).toString("base64url").toUpperCase()}`;
}

export async function issueRechargeCard(input: {
  amountCny: number;
  note?: string | null;
  expiresAt?: string | null;
}) {
  const client = getSupabaseAdminClient();

  if (!client) {
    throw new Error("Supabase 管理客户端不可用。");
  }

  const code = generateRechargeCode();
  const { data, error } = await client
    .from("billing_recharge_cards")
    .insert({
      code_hash: hashCode(code),
      code_preview: maskCode(code),
      amount_cny: Number(input.amountCny.toFixed(8)),
      note: input.note ?? null,
      expires_at: input.expiresAt ?? null,
      status: "active",
    })
    .select("id,amount_cny,code_preview,status,expires_at,created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "生成充值卡密失败。");
  }

  return {
    id: String(data.id),
    amountCny: Number(data.amount_cny),
    codePreview: String(data.code_preview),
    status: String(data.status),
    expiresAt: typeof data.expires_at === "string" ? data.expires_at : null,
    createdAt: typeof data.created_at === "string" ? data.created_at : null,
    code,
  };
}

export async function redeemRechargeCard(userId: string, code: string) {
  const client = getSupabaseAdminClient();

  if (!client) {
    throw new Error("Supabase 管理客户端不可用。");
  }

  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    throw new Error("请输入充值卡密。");
  }

  const { data, error } = await client.rpc("redeem_billing_recharge_card", {
    p_user_id: userId,
    p_code_hash: hashCode(normalizedCode),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "兑换充值卡密失败。");
  }

  const result = data as {
    orderId?: string;
    amountCny?: number | string;
    balanceCny?: number | string;
    codePreview?: string;
  };

  return {
    orderId: String(result.orderId ?? ""),
    amountCny: Number(result.amountCny ?? 0),
    balanceCny: Number(result.balanceCny ?? 0),
    codePreview: String(result.codePreview ?? ""),
  };
}
