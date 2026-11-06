import "server-only";

import { normalizeUpstreamBaseUrl } from "@/lib/upstream";

export type UsageBreakdown = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  cacheCreationTokens: number;
  imageInputTokens: number;
  audioInputTokens: number;
  audioOutputTokens: number;
};

export type ModelPricing = {
  modelId: string;
  quotaType: "token" | "fixed";
  tags: string[];
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  cachedInputPerMillion: number | null;
  cacheCreationPerMillion: number | null;
  imageInputPerMillion: number | null;
  audioInputPerMillion: number | null;
  audioOutputPerMillion: number | null;
  fixedPrice: number | null;
  fixedUnit: string | null;
  source: "upstream";
  sourceUpdatedAt: string;
};

export type BillingEstimate = {
  modelId: string;
  amount: number | null;
  currency: "CNY";
  usage: UsageBreakdown;
  pricing: ModelPricing | null;
  note: string | null;
};

type UpstreamPricingItem = {
  model_name?: string;
  tags?: string;
  quota_type?: number;
  model_ratio?: number;
  completion_ratio?: number;
  cache_ratio?: number;
  create_cache_ratio?: number;
  image_ratio?: number;
  audio_ratio?: number;
  audio_completion_ratio?: number;
  model_price?: number;
  other_info?: {
    group_units?: Record<string, string>;
  };
};

type UpstreamPricingPayload = {
  data?: UpstreamPricingItem[];
};

const emptyUsage: UsageBreakdown = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
  cacheCreationTokens: 0,
  imageInputTokens: 0,
  audioInputTokens: 0,
  audioOutputTokens: 0,
};

let cachedPricing:
  | {
      expiresAt: number;
      map: Map<string, ModelPricing>;
      sourceUpdatedAt: string;
    }
  | undefined;

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberOrZero(value: unknown) {
  const parsed = numberOrNull(value);
  return parsed ?? 0;
}

function normalizeModelId(modelId: string) {
  return modelId.trim().toLowerCase();
}

function splitTags(tags?: string) {
  return (
    tags
      ?.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) ?? []
  );
}

function resolveFixedUnit(item: UpstreamPricingItem) {
  const units = item.other_info?.group_units;

  if (!units) {
    return "request";
  }

  return units.default ?? Object.values(units).find(Boolean) ?? "request";
}

function normalizePricingItem(
  item: UpstreamPricingItem,
  sourceUpdatedAt: string,
): ModelPricing | null {
  const modelId = item.model_name?.trim();

  if (!modelId) {
    return null;
  }

  const inputPerMillion =
    item.quota_type === 0 ? numberOrZero(item.model_ratio) * 2 : null;
  const outputRatio = numberOrNull(item.completion_ratio);

  return {
    modelId,
    quotaType: item.quota_type === 1 ? "fixed" : "token",
    tags: splitTags(item.tags),
    inputPerMillion,
    outputPerMillion:
      inputPerMillion !== null && outputRatio !== null
        ? inputPerMillion * outputRatio
        : null,
    cachedInputPerMillion:
      inputPerMillion !== null && numberOrNull(item.cache_ratio) !== null
        ? inputPerMillion * numberOrZero(item.cache_ratio)
        : null,
    cacheCreationPerMillion:
      inputPerMillion !== null && numberOrNull(item.create_cache_ratio) !== null
        ? inputPerMillion * numberOrZero(item.create_cache_ratio)
        : null,
    imageInputPerMillion:
      inputPerMillion !== null && numberOrNull(item.image_ratio) !== null
        ? inputPerMillion * numberOrZero(item.image_ratio)
        : null,
    audioInputPerMillion:
      inputPerMillion !== null && numberOrNull(item.audio_ratio) !== null
        ? inputPerMillion * numberOrZero(item.audio_ratio)
        : null,
    audioOutputPerMillion:
      inputPerMillion !== null && numberOrNull(item.audio_completion_ratio) !== null
        ? inputPerMillion * numberOrZero(item.audio_completion_ratio)
        : null,
    fixedPrice: item.quota_type === 1 ? numberOrNull(item.model_price) : null,
    fixedUnit: item.quota_type === 1 ? resolveFixedUnit(item) : null,
    source: "upstream" as const,
    sourceUpdatedAt,
  };
}

function tokenPricingWeight(pricing: ModelPricing) {
  return (
    (pricing.inputPerMillion ?? 0) +
    (pricing.outputPerMillion ?? 0) +
    (pricing.cachedInputPerMillion ?? 0) +
    (pricing.cacheCreationPerMillion ?? 0) +
    (pricing.imageInputPerMillion ?? 0) +
    (pricing.audioInputPerMillion ?? 0) +
    (pricing.audioOutputPerMillion ?? 0)
  );
}

function pricingSortValue(pricing: ModelPricing) {
  if (pricing.quotaType === "fixed") {
    return pricing.fixedPrice ?? Number.POSITIVE_INFINITY;
  }

  return tokenPricingWeight(pricing);
}

function chooseCheaperPricing(current: ModelPricing, next: ModelPricing) {
  const currentValue = pricingSortValue(current);
  const nextValue = pricingSortValue(next);

  if (nextValue !== currentValue) {
    return nextValue < currentValue ? next : current;
  }

  const currentInput = current.inputPerMillion ?? Number.POSITIVE_INFINITY;
  const nextInput = next.inputPerMillion ?? Number.POSITIVE_INFINITY;

  if (nextInput !== currentInput) {
    return nextInput < currentInput ? next : current;
  }

  const currentFixed = current.fixedPrice ?? Number.POSITIVE_INFINITY;
  const nextFixed = next.fixedPrice ?? Number.POSITIVE_INFINITY;

  return nextFixed < currentFixed ? next : current;
}

async function fetchUpstreamPricing() {
  const baseUrl = process.env.UPSTREAM_API_BASE_URL;

  if (!baseUrl) {
    return null;
  }

  const headers = new Headers();
  const apiKey = process.env.UPSTREAM_API_KEY;

  if (apiKey) {
    headers.set("authorization", `Bearer ${apiKey}`);
  }

  const response = await fetch(`${normalizeUpstreamBaseUrl(baseUrl)}/api/pricing`, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as UpstreamPricingPayload;

  if (!payload.data?.length) {
    return null;
  }

  const sourceUpdatedAt = new Date().toISOString();
  const map = new Map<string, ModelPricing>();

  for (const item of payload.data) {
    const pricing = normalizePricingItem(item, sourceUpdatedAt);

    if (pricing) {
      const key = normalizeModelId(pricing.modelId);
      const current = map.get(key);

      map.set(key, current ? chooseCheaperPricing(current, pricing) : pricing);
    }
  }

  return {
    map,
    sourceUpdatedAt,
  };
}

export async function getPricingCatalog() {
  const now = Date.now();

  if (cachedPricing && cachedPricing.expiresAt > now) {
    return cachedPricing.map;
  }

  const livePricing = await fetchUpstreamPricing();

  cachedPricing = {
    map: livePricing?.map ?? new Map<string, ModelPricing>(),
    sourceUpdatedAt: livePricing?.sourceUpdatedAt ?? new Date().toISOString(),
    expiresAt: now + 30 * 60 * 1000,
  };

  return cachedPricing.map;
}

export function findPricingForModel(
  pricingCatalog: Map<string, ModelPricing>,
  modelId?: string | null,
  aliases: string[] = [],
) {
  const candidates = [modelId, ...aliases].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const pricing = pricingCatalog.get(normalizeModelId(candidate));

    if (pricing) {
      return pricing;
    }
  }

  return null;
}

function readNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function readNestedNumber(source: Record<string, unknown>, key: string) {
  const value = source[key];

  if (!value || typeof value !== "object") {
    return 0;
  }

  return readNumber(value as Record<string, unknown>, [
    "cached_tokens",
    "cache_read_input_tokens",
  ]);
}

export function extractUsageBreakdown(responsePayload: unknown): UsageBreakdown {
  if (!responsePayload || typeof responsePayload !== "object") {
    return { ...emptyUsage };
  }

  const payload = responsePayload as Record<string, unknown>;
  const usage =
    payload.usage && typeof payload.usage === "object"
      ? (payload.usage as Record<string, unknown>)
      : payload;

  const inputTokens = readNumber(usage, [
    "input_tokens",
    "prompt_tokens",
    "cache_creation_input_tokens",
  ]);
  const outputTokens = readNumber(usage, ["output_tokens", "completion_tokens"]);
  const cachedInputTokens =
    readNumber(usage, ["cache_read_input_tokens", "cached_input_tokens"]) +
    readNestedNumber(usage, "prompt_tokens_details") +
    readNestedNumber(usage, "input_tokens_details");

  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
    cacheCreationTokens: readNumber(usage, ["cache_creation_input_tokens"]),
    imageInputTokens: readNumber(usage, ["image_input_tokens"]),
    audioInputTokens: readNumber(usage, ["audio_input_tokens"]),
    audioOutputTokens: readNumber(usage, ["audio_output_tokens"]),
  };
}

function chargeByTokens(tokens: number, ratePerMillion: number | null) {
  if (!tokens || ratePerMillion === null) {
    return 0;
  }

  return (tokens * ratePerMillion) / 1_000_000;
}

export function estimateBilling(
  modelId: string | null | undefined,
  pricing: ModelPricing | null,
  responsePayload: unknown,
): BillingEstimate {
  const usage = extractUsageBreakdown(responsePayload);
  const resolvedModelId = modelId?.trim() || pricing?.modelId || "unknown";

  if (!pricing) {
    return {
      modelId: resolvedModelId,
      amount: null,
      currency: "CNY",
      usage,
      pricing: null,
      note: "No pricing found for this model.",
    };
  }

  if (pricing.quotaType === "fixed") {
    return {
      modelId: resolvedModelId,
      amount: pricing.fixedPrice,
      currency: "CNY",
      usage,
      pricing,
      note: pricing.fixedUnit ? `Fixed price per ${pricing.fixedUnit}.` : null,
    };
  }

  const amount =
    chargeByTokens(usage.inputTokens, pricing.inputPerMillion) +
    chargeByTokens(usage.outputTokens, pricing.outputPerMillion) +
    chargeByTokens(usage.cachedInputTokens, pricing.cachedInputPerMillion) +
    chargeByTokens(usage.cacheCreationTokens, pricing.cacheCreationPerMillion) +
    chargeByTokens(usage.imageInputTokens, pricing.imageInputPerMillion) +
    chargeByTokens(usage.audioInputTokens, pricing.audioInputPerMillion) +
    chargeByTokens(usage.audioOutputTokens, pricing.audioOutputPerMillion);

  return {
    modelId: resolvedModelId,
    amount,
    currency: "CNY",
    usage,
    pricing,
    note: null,
  };
}

export function formatPricingSummary(pricing?: ModelPricing | null) {
  if (!pricing) {
    return "价格待同步";
  }

  if (pricing.quotaType === "fixed") {
    return `¥${pricing.fixedPrice ?? 0}/${pricing.fixedUnit ?? "request"}`;
  }

  const input = pricing.inputPerMillion ?? 0;
  const output = pricing.outputPerMillion ?? 0;

  return `¥${input}/1M 输入 · ¥${output}/1M 输出`;
}
