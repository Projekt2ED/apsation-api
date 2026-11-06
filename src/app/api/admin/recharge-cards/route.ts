import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-errors";
import { isAdminUser } from "@/lib/admin-access";
import { getCurrentUser } from "@/lib/auth";
import { issueRechargeCard } from "@/lib/recharge-cards";

type IssuePayload = {
  amountCny?: unknown;
  note?: unknown;
  expiresAt?: unknown;
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

  if (!isAdminUser(user)) {
    return apiErrorResponse({
      code: "admin_required",
      message: "需要管理员权限。",
      status: 403,
    });
  }

  let body: IssuePayload;

  try {
    body = (await request.json()) as IssuePayload;
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
      code: "invalid_card_amount",
      message: "卡密金额必须大于 0。",
      status: 400,
    });
  }

  const note = typeof body.note === "string" ? body.note.trim() : null;
  const expiresAt = typeof body.expiresAt === "string" ? body.expiresAt.trim() : null;

  try {
    const card = await issueRechargeCard({
      amountCny: amount,
      note,
      expiresAt: expiresAt || null,
    });

    return NextResponse.json({
      card,
      message: "请立即保存卡密，明文不会再次展示。",
    });
  } catch (error) {
    return apiErrorResponse({
      code: "recharge_card_issue_failed",
      message: error instanceof Error ? error.message : "生成充值卡密失败。",
      status: 500,
    });
  }
}
