import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import {
  estimateBilling,
  findPricingForModel,
  getPricingCatalog,
} from "@/lib/billing";
import { resolveUpstreamCatalogModelId } from "@/lib/model-catalog";
import { playgroundModes } from "@/lib/playground-config";
import { buildQuotaResponsePayload, ensureUserQuota } from "@/lib/quota";
import { buildRateLimitResponsePayload, checkRateLimit } from "@/lib/rate-limit";
import {
  extractModel,
  extractPromptPreview,
  extractResponseReferences,
  normalizeUpstreamBaseUrl,
} from "@/lib/upstream";
import { recordPlaygroundRun } from "@/lib/workspace-data";

const modeEndpointMap = new Map(playgroundModes.map((mode) => [mode.id, mode.endpoint]));

function extractAudioPayload(contentType: string, buffer: Buffer) {
  return {
    mimeType: contentType,
    base64: buffer.toString("base64"),
  };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const user = await getCurrentUser();
  const upstreamBaseUrl = process.env.UPSTREAM_API_BASE_URL;
  const upstreamApiKey = process.env.UPSTREAM_API_KEY;
  let body: {
    modeId?: string;
    payload?: unknown;
  };

  if (!user) {
    return apiErrorResponse({
      code: "login_required",
      message: "Login is required to use Playground.",
      status: 401,
    });
  }

  const rateLimit = checkRateLimit(`playground:user:${user.id}`);

  if (!rateLimit.allowed) {
    return NextResponse.json(buildRateLimitResponsePayload(rateLimit), {
      status: 429,
      headers: {
        "retry-after": String(rateLimit.retryAfterSeconds),
      },
    });
  }

  try {
    body = (await request.json()) as {
      modeId?: string;
      payload?: unknown;
    };
  } catch {
    return apiErrorResponse({
      code: "invalid_json",
      message: "Request body must be valid JSON.",
      status: 400,
    });
  }

  const modeId = body.modeId as (typeof playgroundModes)[number]["id"] | undefined;

  if (!modeId || !modeEndpointMap.has(modeId)) {
    return apiErrorResponse({
      code: "unknown_playground_mode",
      message: "Unknown Playground mode.",
      status: 400,
    });
  }

  if (!upstreamBaseUrl || !upstreamApiKey) {
    return apiErrorResponse({
      code: "model_service_not_configured",
      message:
        "Model API is not configured. Set the model service environment variables first.",
      status: 503,
      meta: {
        modeId,
        endpoint: modeEndpointMap.get(modeId),
      },
    });
  }

  const endpoint = modeEndpointMap.get(modeId) ?? "";
  const targetUrl = `${normalizeUpstreamBaseUrl(upstreamBaseUrl)}${endpoint}`;
  const promptPreview = extractPromptPreview(modeId, body.payload);
  const model = extractModel(body.payload);
  const quota = await ensureUserQuota(user.id);

  if (!quota.allowed) {
    return NextResponse.json(
      buildQuotaResponsePayload(quota.message ?? "Quota check failed.", quota.quota),
      { status: quota.status },
    );
  }

  const resolvedModel = await resolveUpstreamCatalogModelId(model);
  const pricingCatalog = await getPricingCatalog();
  const pricing = findPricingForModel(pricingCatalog, resolvedModel ?? model, [
    model ?? "",
  ]);
  const forwardedPayload =
    body.payload && typeof body.payload === "object" && resolvedModel
      ? {
          ...(body.payload as Record<string, unknown>),
          model: resolvedModel,
        }
      : body.payload ?? {};

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstreamApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forwardedPayload),
      cache: "no-store",
    });

    const contentType = upstreamResponse.headers.get("content-type") ?? "";
    const upstreamRequestId =
      upstreamResponse.headers.get("x-request-id") ??
      upstreamResponse.headers.get("request-id");
    const durationMs = Date.now() - startedAt;

    if (contentType.startsWith("audio/")) {
      const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
      const audioPayload = extractAudioPayload(contentType, buffer);
      const billing = estimateBilling(model, pricing, null);

      await recordPlaygroundRun({
        userId: user?.id ?? null,
        modeId,
        endpoint,
        model,
        promptPreview,
        statusCode: upstreamResponse.status,
        durationMs,
        summary: "Audio returned",
        upstreamRequestId,
        inputTokens: billing.usage.inputTokens,
        outputTokens: billing.usage.outputTokens,
        cachedInputTokens: billing.usage.cachedInputTokens,
        billableAmount: billing.amount,
        billingCurrency: billing.currency,
        pricingModel: billing.pricing?.modelId ?? null,
        pricingSnapshot: billing.pricing,
      });

      return NextResponse.json(audioPayload, { status: upstreamResponse.status });
    }

    const text = await upstreamResponse.text();
    let parsed: unknown = text;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    const refs = extractResponseReferences(parsed);
    const billing = estimateBilling(model, pricing, parsed);

    await recordPlaygroundRun({
      userId: user?.id ?? null,
      modeId,
      endpoint,
      model,
      promptPreview,
      statusCode: upstreamResponse.status,
      durationMs,
      summary: refs.summary,
      errorMessage: refs.errorMessage,
      upstreamRequestId,
      upstreamTaskId: refs.taskId,
      upstreamResultId: refs.resultId,
      taskStatus: refs.status,
      resultUrl: refs.resultUrl,
      note: refs.summary,
      inputTokens: billing.usage.inputTokens,
      outputTokens: billing.usage.outputTokens,
      cachedInputTokens: billing.usage.cachedInputTokens,
      billableAmount: billing.amount,
      billingCurrency: billing.currency,
      pricingModel: billing.pricing?.modelId ?? null,
      pricingSnapshot: billing.pricing,
    });

    return NextResponse.json(parsed, { status: upstreamResponse.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown model service error.";

    await recordPlaygroundRun({
      userId: user?.id ?? null,
      modeId,
      endpoint,
      model,
      promptPreview,
      statusCode: 502,
      durationMs: Date.now() - startedAt,
      summary: "Request failed",
      errorMessage: message,
    });

    return apiErrorResponse({
      code: "model_request_failed",
      message,
      status: 502,
    });
  }
}
