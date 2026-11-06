import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type RechargePayload = {
  amountCny?: unknown;
  provider?: unknown;
};

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return apiErrorResponse({
      code: "login_required",
      message: "请先登录。",
      status: 401,
    });
  }

  let body: RechargePayload;

  try {
    body = (await request.json()) as RechargePayload;
  } catch {
    return apiErrorResponse({
      code: "invalid_json",
      message: "请求体必须是有效 JSON。",
      status: 400,
    });
  }

  const amount = parseAmount(body.amountCny);

  if (!amount || amount <= 0) {
    return apiErrorResponse({
      code: "invalid_recharge_amount",
      message: "充值金额必须大于 0。",
      status: 400,
    });
  }

  const client = getSupabaseAdminClient();

  if (!client) {
    return apiErrorResponse({
      code: "billing_not_configured",
      message: "计费服务未配置。",
      status: 503,
    });
  }

  const provider = typeof body.provider === "string" ? body.provider.trim() : "manual";
  const { data, error } = await client
    .from("billing_recharge_orders")
    .insert({
      user_id: user.id,
      amount_cny: Number(amount.toFixed(8)),
      provider: provider || "manual",
      status: "created",
      metadata: {
        source: "workspace",
      },
    })
    .select("id,amount_cny,status,provider,created_at")
    .single();

  if (error || !data) {
    return apiErrorResponse({
      code: "recharge_order_failed",
      message: error?.message ?? "创建充值订单失败。",
      status: 500,
    });
  }

  return NextResponse.json(
    {
      order: {
        id: data.id,
        amountCny: data.amount_cny,
        status: data.status,
        provider: data.provider,
        createdAt: data.created_at,
      },
      checkoutUrl: null,
      message: "充值订单已创建，支付通道待接入。",
    },
    { status: 202 },
  );
}
