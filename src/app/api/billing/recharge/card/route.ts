import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { redeemRechargeCard } from "@/lib/recharge-cards";

type RedeemPayload = {
  code?: unknown;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return apiErrorResponse({
      code: "login_required",
      message: "请先登录。",
      status: 401,
    });
  }

  let body: RedeemPayload;

  try {
    body = (await request.json()) as RedeemPayload;
  } catch {
    return apiErrorResponse({
      code: "invalid_json",
      message: "请求体必须是有效 JSON。",
      status: 400,
    });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!code) {
    return apiErrorResponse({
      code: "invalid_recharge_code",
      message: "请输入充值卡密。",
      status: 400,
    });
  }

  try {
    const result = await redeemRechargeCard(user.id, code);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return apiErrorResponse({
      code: "recharge_code_failed",
      message: error instanceof Error ? error.message : "兑换卡密失败。",
      status: 400,
    });
  }
}
