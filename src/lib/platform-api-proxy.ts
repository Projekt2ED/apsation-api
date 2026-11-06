import "server-only";

import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-errors";
import {
  estimateBilling,
  findPricingForModel,
  getPricingCatalog,
} from "@/lib/billing";
import {
  authenticatePlatformApiKey,
  touchPlatformApiKeyLastUsed,
} from "@/lib/platform-api-keys";
import { resolveUpstreamCatalogModelId } from "@/lib/model-catalog";
import { buildQuotaResponsePayload, ensureUserQuota } from "@/lib/quota";
import { buildRateLimitResponsePayload, checkRateLimit } from "@/lib/rate-limit";
import {
  extractModel,
  extractPromptPreview,
  extractResponseReferences,
  normalizeUpstreamBaseUrl,
} from "@/lib/upstream";
import { recordPlaygroundRun } from "@/lib/workspace-data";

const endpointModeMap = new Map<string, string>([
  ["/v1/chat/completions", "chat"],
  ["/v1/responses", "responses"],
  ["/v1/messages", "messages"],
  ["/v1/images/generations", "images"],
  ["/v1/audio/speech", "audio"],
]);

const getEndpoints = new Set<string>(["/v1/models"]);
const postEndpoints = new Set<string>([...endpointModeMap.keys()]);

function buildForwardHeaders(request: Request, hasBody: boolean) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  if (hasBody && contentType) {
    headers.set("content-type", contentType);
  }

  if (accept) {
    headers.set("accept", accept);
  }

  return headers;
}

function buildProxyResponseHeaders(upstreamResponse: Response) {
  const headers = new Headers();

  for (const name of [
    "content-type",
    "content-disposition",
    "x-request-id",
    "request-id",
  ]) {
    const value = upstreamResponse.headers.get(name);

    if (value) {
      headers.set(name, value);
    }
  }

  return headers;
}

function parseJsonBody(text: string | null, contentType: string) {
  if (!text || !contentType.includes("application/json")) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function handlePlatformApiRequest(request: Request, endpoint: string) {
  const method = request.method.toUpperCase();
  const isGet = method === "GET";
  const isPost = method === "POST";

  if ((isGet && !getEndpoints.has(endpoint)) || (isPost && !postEndpoints.has(endpoint))) {
    return apiErrorResponse({
      code: "unsupported_route",
      message: "Unsupported API route.",
      status: 404,
    });
  }

  if (!isGet && !isPost) {
    return apiErrorResponse({
      code: "method_not_allowed",
      message: "Method not allowed.",
      status: 405,
    });
  }

  const auth = await authenticatePlatformApiKey(request.headers.get("authorization"));

  if (!auth) {
    return apiErrorResponse({
      code: "invalid_api_key",
      message: "Invalid API key.",
      status: 401,
      headers: {
        "www-authenticate": "Bearer",
      },
    });
  }

  const rateLimit = checkRateLimit(`platform-key:${auth.keyId}`);

  if (!rateLimit.allowed) {
    return NextResponse.json(buildRateLimitResponsePayload(rateLimit), {
      status: 429,
      headers: {
        "retry-after": String(rateLimit.retryAfterSeconds),
      },
    });
  }

  const upstreamBaseUrl = process.env.UPSTREAM_API_BASE_URL;
  const upstreamApiKey = process.env.UPSTREAM_API_KEY;

  if (!upstreamBaseUrl || !upstreamApiKey) {
    return apiErrorResponse({
      code: "model_service_not_configured",
      message: "Model API is not configured.",
      status: 503,
    });
  }

  const startedAt = Date.now();
  const requestUrl = new URL(request.url);
  const targetUrl = `${normalizeUpstreamBaseUrl(upstreamBaseUrl)}${endpoint}${requestUrl.search}`;
  const rawBody = isPost ? await request.text() : null;
  const parsedBody = parseJsonBody(rawBody, request.headers.get("content-type") ?? "");
  const modeId = endpointModeMap.get(endpoint) ?? null;
  const promptPreview = modeId ? extractPromptPreview(modeId, parsedBody) : null;
  const model = modeId ? extractModel(parsedBody) : null;
  const quota = modeId ? await ensureUserQuota(auth.userId) : null;

  if (quota && !quota.allowed) {
    return NextResponse.json(
      buildQuotaResponsePayload(quota.message ?? "Quota check failed.", quota.quota),
      { status: quota.status },
    );
  }

  const resolvedModel = modeId ? await resolveUpstreamCatalogModelId(model) : null;
  const pricingCatalog = modeId ? await getPricingCatalog() : null;
  const pricing =
    modeId && pricingCatalog
      ? findPricingForModel(pricingCatalog, resolvedModel ?? model, [model ?? ""])
      : null;
  const forwardedBody =
    parsedBody && typeof parsedBody === "object" && resolvedModel
      ? JSON.stringify({
          ...(parsedBody as Record<string, unknown>),
          model: resolvedModel,
        })
      : rawBody;
  const forwardedHeaders = buildForwardHeaders(request, Boolean(forwardedBody));
  forwardedHeaders.set("authorization", `Bearer ${upstreamApiKey}`);

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers: forwardedHeaders,
      body: forwardedBody,
      cache: "no-store",
    });

    const durationMs = Date.now() - startedAt;
    const contentType = upstreamResponse.headers.get("content-type") ?? "";
    const upstreamRequestId =
      upstreamResponse.headers.get("x-request-id") ??
      upstreamResponse.headers.get("request-id");

    await touchPlatformApiKeyLastUsed(auth.keyId);

    if (!modeId) {
      const text = await upstreamResponse.text();
      return new Response(text, {
        status: upstreamResponse.status,
        headers: buildProxyResponseHeaders(upstreamResponse),
      });
    }

    if (contentType.startsWith("audio/")) {
      const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
      const billing = estimateBilling(model, pricing, null);

      await recordPlaygroundRun({
        userId: auth.userId,
        apiKeyId: auth.keyId,
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

      return new Response(buffer, {
        status: upstreamResponse.status,
        headers: buildProxyResponseHeaders(upstreamResponse),
      });
    }

    const text = await upstreamResponse.text();
    let parsedResponse: unknown = text;

    try {
      parsedResponse = JSON.parse(text);
    } catch {
      parsedResponse = { raw: text };
    }

    const refs = extractResponseReferences(parsedResponse);
    const billing = estimateBilling(model, pricing, parsedResponse);

    await recordPlaygroundRun({
      userId: auth.userId,
      apiKeyId: auth.keyId,
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

    return new Response(text, {
      status: upstreamResponse.status,
      headers: buildProxyResponseHeaders(upstreamResponse),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown model service error.";

    if (modeId) {
      await recordPlaygroundRun({
        userId: auth.userId,
        apiKeyId: auth.keyId,
        modeId,
        endpoint,
        model,
        promptPreview,
        statusCode: 502,
        durationMs: Date.now() - startedAt,
        summary: "Request failed",
        errorMessage: message,
      });
    }

    return apiErrorResponse({
      code: "model_request_failed",
      message,
      status: 502,
    });
  }
}
