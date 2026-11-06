import "server-only";

import type {
  CatalogModel,
  CatalogSection,
  ModelCatalog,
  ModelSectionId,
  ModelSuggestions,
  ProviderOption,
  WrapperRoute,
} from "@/lib/catalog-types";
import { findPricingForModel, getPricingCatalog, type ModelPricing } from "@/lib/billing";
import { normalizeUpstreamBaseUrl } from "@/lib/upstream";

type UpstreamModel = {
  id: string;
  owned_by?: string;
  supported_endpoint_types?: string[];
};

type ProviderInfo = {
  id: string;
  label: string;
};

type AggregatedModel = {
  familyKey: string;
  providerId: string;
  provider: string;
  sectionId: ModelSectionId;
  endpoints: Set<string>;
  supportedRoutes: Set<WrapperRoute>;
  sourceIds: string[];
};

const sectionMeta: Record<ModelSectionId, { title: string; description: string }> = {
  text: {
    title: "文本",
    description: "问答、写作、分析、工作流与通用推理。",
  },
  image: {
    title: "图片",
    description: "文生图、编辑、放大与视觉生成链路。",
  },
  audio: {
    title: "语音",
    description: "TTS、语音预览与音频相关能力。",
  },
  video: {
    title: "视频",
    description: "视频生成与异步任务类模型。",
  },
  embedding: {
    title: "向量",
    description: "Embedding、Rerank 与检索增强能力。",
  },
  utility: {
    title: "其他",
    description: "翻译、辅助型模型和补充能力。",
  },
};

const endpointLabelMap: Record<string, string> = {
  openai: "OpenAI",
  "openai-response": "Responses",
  anthropic: "Anthropic",
  "image-generation": "Images",
  gemini: "Gemini",
  "jina-rerank": "Rerank",
};

const fallbackModels: UpstreamModel[] = [
  { id: "gpt-5.5", owned_by: "openai", supported_endpoint_types: ["openai", "openai-response"] },
  { id: "gpt-5.5-pro", owned_by: "openai", supported_endpoint_types: ["openai", "openai-response"] },
  { id: "gpt-5", owned_by: "openai", supported_endpoint_types: ["openai"] },
  { id: "gpt-4.1", owned_by: "openai", supported_endpoint_types: ["openai"] },
  { id: "gpt-4o", owned_by: "openai", supported_endpoint_types: ["openai"] },
  { id: "claude-opus-4-7", owned_by: "anthropic", supported_endpoint_types: ["anthropic", "openai"] },
  { id: "claude-sonnet-4-6", owned_by: "anthropic", supported_endpoint_types: ["anthropic", "openai"] },
  { id: "deepseek-v4-pro", owned_by: "deepseek", supported_endpoint_types: ["openai"] },
  { id: "MiniMax-M2.7", owned_by: "minimax", supported_endpoint_types: ["openai"] },
  { id: "MiniMax-M2.7-highspeed", owned_by: "minimax", supported_endpoint_types: ["openai"] },
  { id: "qwen3.6-plus", owned_by: "qwen", supported_endpoint_types: ["openai"] },
  { id: "kimi-k2.6", owned_by: "moonshot", supported_endpoint_types: ["openai"] },
  { id: "grok-4.1", owned_by: "xai", supported_endpoint_types: ["openai"] },
  { id: "gpt-image-1", owned_by: "openai", supported_endpoint_types: ["image-generation", "openai"] },
  { id: "gpt-image-2", owned_by: "openai", supported_endpoint_types: ["image-generation", "openai"] },
  { id: "gemini-3.1-flash-image-preview", owned_by: "google", supported_endpoint_types: ["gemini", "openai"] },
  { id: "doubao-seedream-5-0", owned_by: "doubao", supported_endpoint_types: ["openai"] },
  { id: "qwen-image", owned_by: "qwen", supported_endpoint_types: ["openai"] },
  { id: "gpt-4o-mini-tts", owned_by: "openai", supported_endpoint_types: ["openai"] },
  { id: "gpt-4o-transcribe", owned_by: "openai", supported_endpoint_types: ["openai"] },
  { id: "gpt-audio", owned_by: "openai", supported_endpoint_types: ["openai"] },
  { id: "whisper-1", owned_by: "openai", supported_endpoint_types: ["openai"] },
  { id: "gpt-video-2", owned_by: "openai", supported_endpoint_types: ["openai"] },
  { id: "doubao-seedance-2-0", owned_by: "doubao", supported_endpoint_types: ["openai"] },
  { id: "wanx2.1-t2v-turbo", owned_by: "wan", supported_endpoint_types: ["openai"] },
  { id: "kling-v3", owned_by: "kling", supported_endpoint_types: ["openai"] },
  { id: "veo-3", owned_by: "google", supported_endpoint_types: ["openai"] },
  { id: "text-embedding-3-large", owned_by: "openai", supported_endpoint_types: ["openai"] },
  { id: "text-embedding-3-small", owned_by: "openai", supported_endpoint_types: ["openai"] },
  { id: "qwen3-reranker-8b", owned_by: "qwen", supported_endpoint_types: ["jina-rerank"] },
];

const textRegex =
  /^(gpt|o1|o3|o4|claude|deepseek|qwen|kimi|glm|grok|chatgpt|moonshot|mistral|llama|gemini|doubao|hunyuan|baichuan|step|yi|minimax)/i;
const imageRegex =
  /(image|seedream|seededit|flux|recraft|ideogram|dreamina|dall-e|banana|kontext|paint|upscale|vectorize|edit)/i;
const audioRegex =
  /(audio|tts|speech|voice|transcribe|whisper|chirp|suno|udio)/i;
const videoRegex =
  /(video|veo|kling|wanx|wan-|seedance|vidu|luma|ray-2|hailuo|pixverse|higgsfield|sora|image-to-video|text-to-video|reference-to-video|start-end-to-video)/i;
const embeddingRegex = /(embedding|rerank|bge|jina)/i;

function uniqueModels(models: UpstreamModel[]) {
  const seen = new Set<string>();

  return models.filter((model) => {
    if (seen.has(model.id)) {
      return false;
    }

    seen.add(model.id);
    return true;
  });
}

function formatEndpoints(endpoints?: string[]) {
  if (!endpoints?.length) {
    return ["OpenAI"];
  }

  return [...new Set(endpoints.map((item) => endpointLabelMap[item] ?? item))];
}

function classifyModel(id: string, endpoints: string[]) {
  const endpointText = endpoints.join(" ").toLowerCase();

  if (embeddingRegex.test(id) || endpointText.includes("rerank")) {
    return "embedding";
  }

  if (endpointText.includes("image-generation") || imageRegex.test(id)) {
    return "image";
  }

  if (audioRegex.test(id)) {
    return "audio";
  }

  if (videoRegex.test(id)) {
    return "video";
  }

  if (textRegex.test(id)) {
    return "text";
  }

  return "utility";
}

function resolveProvider(model: UpstreamModel): ProviderInfo {
  const lowerId = model.id.toLowerCase();

  if (lowerId.startsWith("claude")) {
    return { id: "anthropic", label: "Anthropic" };
  }

  if (
    /^(gpt|chatgpt|o1|o3|o4|dall-e|whisper|text-embedding)/i.test(lowerId)
  ) {
    return { id: "openai", label: "OpenAI" };
  }

  if (lowerId.startsWith("gemini") || lowerId.startsWith("veo")) {
    return { id: "google", label: "Google" };
  }

  if (lowerId.startsWith("grok")) {
    return { id: "xai", label: "xAI" };
  }

  if (lowerId.startsWith("qwen")) {
    return { id: "qwen", label: "Qwen" };
  }

  if (lowerId.startsWith("kimi")) {
    return { id: "moonshot", label: "Moonshot" };
  }

  if (lowerId.startsWith("deepseek")) {
    return { id: "deepseek", label: "DeepSeek" };
  }

  if (lowerId.startsWith("minimax")) {
    return { id: "minimax", label: "MiniMax" };
  }

  if (lowerId.startsWith("glm")) {
    return { id: "zhipu", label: "Zhipu" };
  }

  if (lowerId.startsWith("doubao")) {
    return { id: "doubao", label: "Doubao" };
  }

  if (lowerId.startsWith("wanx") || lowerId.startsWith("wan-")) {
    return { id: "wan", label: "Wan" };
  }

  if (lowerId.startsWith("kling")) {
    return { id: "kling", label: "Kling" };
  }

  const raw = model.owned_by?.trim().toLowerCase() || "custom";

  if (raw === "vertex-ai") return { id: "anthropic", label: "Anthropic" };
  if (raw === "openai") return { id: "openai", label: "OpenAI" };
  if (raw === "xai") return { id: "xai", label: "xAI" };
  if (raw === "gemini" || raw === "google") return { id: "google", label: "Google" };
  if (raw === "moonshot") return { id: "moonshot", label: "Moonshot" };
  if (raw === "deepseek") return { id: "deepseek", label: "DeepSeek" };
  if (raw === "minimax") return { id: "minimax", label: "MiniMax" };
  if (raw === "qwen") return { id: "qwen", label: "Qwen" };
  if (raw === "doubao") return { id: "doubao", label: "Doubao" };

  return {
    id: raw.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    label: raw
      .split(/[-_/]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  };
}

function stripDateSuffix(id: string) {
  return id.replace(/-\d{4}-\d{2}-\d{2}$/i, "").replace(/-\d{8}$/i, "");
}

function stripDecorators(id: string) {
  return stripDateSuffix(id)
    .replace(/-chat-latest$/i, "")
    .replace(/-latest$/i, "")
    .replace(/-preview$/i, "")
    .replace(/-thinking$/i, "")
    .replace(/-chat$/i, "");
}

function normalizeFamilyKey(modelId: string) {
  const lowerId = modelId.toLowerCase();

  if (/^gpt-4o-mini-tts/.test(lowerId)) {
    return "gpt-4o-mini-tts";
  }

  if (/^gpt-4o-transcribe/.test(lowerId)) {
    return "gpt-4o-transcribe";
  }

  if (/^gpt-audio/.test(lowerId)) {
    return "gpt-audio";
  }

  if (/^gpt-5(?:\.\d+)?/.test(lowerId)) {
    return lowerId.match(/^gpt-5(?:\.\d+)?/)?.[0] ?? stripDecorators(lowerId);
  }

  if (/^gpt-4\.1/.test(lowerId)) {
    return "gpt-4.1";
  }

  if (/^gpt-4o/.test(lowerId)) {
    return "gpt-4o";
  }

  if (/^chatgpt-4o/.test(lowerId)) {
    return "chatgpt-4o";
  }

  if (/^gpt-4-turbo/.test(lowerId)) {
    return "gpt-4-turbo";
  }

  if (/^gpt-3\.5-turbo/.test(lowerId)) {
    return "gpt-3.5-turbo";
  }

  if (/^gpt-4(?:$|-)/.test(lowerId)) {
    return "gpt-4";
  }

  if (/^gpt-image-2/.test(lowerId)) {
    return "gpt-image-2";
  }

  if (/^gpt-image-1/.test(lowerId)) {
    return "gpt-image-1";
  }

  if (/^text-embedding-3-(large|small)/.test(lowerId)) {
    return lowerId.match(/^text-embedding-3-(large|small)/)?.[0] ?? lowerId;
  }

  return stripDecorators(lowerId);
}

function buildSupportedRoutes(
  sectionId: ModelSectionId,
  endpointTypes?: string[],
): WrapperRoute[] {
  const types = endpointTypes ?? [];
  const routes = new Set<WrapperRoute>();

  if (sectionId === "text") {
    if (types.length === 0 || types.includes("openai")) {
      routes.add("/v1/chat/completions");
      routes.add("/v1/responses");
    }

    if (types.includes("openai-response")) {
      routes.add("/v1/responses");
    }

    if (types.includes("anthropic")) {
      routes.add("/v1/messages");
    }

    if (!routes.size) {
      routes.add("/v1/chat/completions");
      routes.add("/v1/responses");
    }
  }

  if (sectionId === "image") {
    routes.add("/v1/images/generations");
  }

  if (sectionId === "audio") {
    routes.add("/v1/audio/speech");
  }

  return [...routes];
}

function variantPenalty(id: string, familyKey: string) {
  let score = id === familyKey ? 0 : 100;

  if (/latest/i.test(id)) score += 20;
  if (/preview/i.test(id)) score += 30;
  if (/thinking/i.test(id)) score += 25;
  if (/\d{4}-\d{2}-\d{2}$/i.test(id) || /\d{8}$/i.test(id)) score += 15;
  if (/-chat/i.test(id)) score += 10;
  if (/(?:-high|-medium|-low|-mini|-nano|-turbo|-16k|-32k)\b/i.test(id)) score += 12;

  return score + id.length / 100;
}

function choosePrimaryModelId(familyKey: string, sourceIds: string[]) {
  return [...sourceIds].sort((left, right) => {
    const scoreDiff = variantPenalty(left, familyKey) - variantPenalty(right, familyKey);

    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return left.localeCompare(right, "en");
  })[0];
}

function flattenModels(sections: CatalogSection[]) {
  return sections.flatMap((section) => section.models);
}

function findCatalogModelById(catalog: ModelCatalog, modelId: string) {
  const requested = modelId.trim().toLowerCase();

  return flattenModels(catalog.sections).find(
    (model) =>
      model.id.toLowerCase() === requested ||
      model.aliases.some((alias) => alias.toLowerCase() === requested),
  );
}

function rankSuggestions(models: CatalogModel[], patterns: RegExp[], limit = 16) {
  const preferred: string[] = [];

  for (const pattern of patterns) {
    for (const model of models) {
      if (pattern.test(model.id) && !preferred.includes(model.id)) {
        preferred.push(model.id);
      }
    }
  }

  for (const model of models) {
    if (!preferred.includes(model.id)) {
      preferred.push(model.id);
    }
  }

  return preferred.slice(0, limit);
}

function buildSuggestions(sections: CatalogSection[]): ModelSuggestions {
  const textModels = sections.find((section) => section.id === "text")?.models ?? [];
  const imageModels = sections.find((section) => section.id === "image")?.models ?? [];
  const audioModels = sections.find((section) => section.id === "audio")?.models ?? [];
  const videoModels = sections.find((section) => section.id === "video")?.models ?? [];

  return {
    chat: rankSuggestions(textModels, [
      /^gpt-5/i,
      /^gpt-4\.1/i,
      /^gpt-4o/i,
      /^claude-opus/i,
      /^claude-sonnet/i,
      /^deepseek/i,
      /^minimax/i,
      /^qwen/i,
      /^kimi/i,
      /^grok/i,
    ]),
    images: rankSuggestions(imageModels, [
      /^gpt-image/i,
      /gemini.*image/i,
      /seedream/i,
      /qwen-image/i,
      /flux/i,
    ]),
    audio: rankSuggestions(audioModels, [
      /gpt-4o-mini-tts/i,
      /gpt-audio/i,
      /gpt-4o-transcribe/i,
      /whisper/i,
      /speech/i,
    ]),
    video: rankSuggestions(videoModels, [
      /kling/i,
      /seedance/i,
      /wanx/i,
      /veo/i,
      /vidu/i,
      /luma/i,
      /^gpt-video/i,
    ]),
  };
}

function buildProviders(sections: CatalogSection[]): ProviderOption[] {
  const counts = new Map<string, ProviderOption>();

  for (const model of flattenModels(sections)) {
    const existing = counts.get(model.providerId);

    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(model.providerId, {
      id: model.providerId,
      label: model.provider,
      count: 1,
    });
  }

  return [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.label.localeCompare(right.label, "en");
  });
}

function serializePricing(pricing: ModelPricing | null) {
  if (!pricing) {
    return null;
  }

  return {
    modelId: pricing.modelId,
    quotaType: pricing.quotaType,
    tags: pricing.tags,
    inputPerMillion: pricing.inputPerMillion,
    outputPerMillion: pricing.outputPerMillion,
    cachedInputPerMillion: pricing.cachedInputPerMillion,
    cacheCreationPerMillion: pricing.cacheCreationPerMillion,
    imageInputPerMillion: pricing.imageInputPerMillion,
    audioInputPerMillion: pricing.audioInputPerMillion,
    audioOutputPerMillion: pricing.audioOutputPerMillion,
    fixedPrice: pricing.fixedPrice,
    fixedUnit: pricing.fixedUnit,
    sourceUpdatedAt: pricing.sourceUpdatedAt,
  };
}

function serializeAliasPricings(
  pricingCatalog: Map<string, ModelPricing>,
  aliases: string[],
) {
  return aliases
    .map((alias) => findPricingForModel(pricingCatalog, alias))
    .filter((pricing): pricing is ModelPricing => Boolean(pricing))
    .map((pricing) => ({
      modelId: pricing.modelId,
      quotaType: pricing.quotaType,
      inputPerMillion: pricing.inputPerMillion,
      outputPerMillion: pricing.outputPerMillion,
      fixedPrice: pricing.fixedPrice,
      fixedUnit: pricing.fixedUnit,
    }));
}

function buildSections(models: UpstreamModel[], pricingCatalog: Map<string, ModelPricing>) {
  const buckets = new Map<string, AggregatedModel>();

  for (const model of models) {
    const endpoints = formatEndpoints(model.supported_endpoint_types);
    const sectionId = classifyModel(model.id, endpoints);
    const provider = resolveProvider(model);
    const familyKey = normalizeFamilyKey(model.id);
    const bucketKey = `${sectionId}:${provider.id}:${familyKey}`;
    const existing = buckets.get(bucketKey);

    if (!existing) {
      buckets.set(bucketKey, {
        familyKey,
        providerId: provider.id,
        provider: provider.label,
        sectionId,
        endpoints: new Set(endpoints),
        supportedRoutes: new Set(buildSupportedRoutes(sectionId, model.supported_endpoint_types)),
        sourceIds: [model.id],
      });
      continue;
    }

    endpoints.forEach((endpoint) => existing.endpoints.add(endpoint));
    buildSupportedRoutes(sectionId, model.supported_endpoint_types).forEach((route) =>
      existing.supportedRoutes.add(route),
    );

    if (!existing.sourceIds.includes(model.id)) {
      existing.sourceIds.push(model.id);
    }
  }

  const sectionBuckets = new Map<ModelSectionId, CatalogModel[]>(
    Object.keys(sectionMeta).map((key) => [key as ModelSectionId, []]),
  );

  for (const bucket of buckets.values()) {
    const primaryId = choosePrimaryModelId(bucket.familyKey, bucket.sourceIds);
    const aliases = [...bucket.sourceIds].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
    const pricing = findPricingForModel(
      pricingCatalog,
      primaryId,
      [bucket.familyKey, ...aliases],
    );

    sectionBuckets.get(bucket.sectionId)?.push({
      id: bucket.familyKey,
      targetId: primaryId,
      provider: bucket.provider,
      providerId: bucket.providerId,
      sectionId: bucket.sectionId,
      endpoints: [...bucket.endpoints].sort((left, right) => left.localeCompare(right, "en")),
      supportedRoutes: [...bucket.supportedRoutes],
      aliases,
      variantCount: Math.max(bucket.sourceIds.length - 1, 0),
      pricing: serializePricing(pricing),
      aliasPricings: serializeAliasPricings(pricingCatalog, aliases),
    });
  }

  return (Object.keys(sectionMeta) as ModelSectionId[])
    .map((sectionId) => ({
      id: sectionId,
      title: sectionMeta[sectionId].title,
      description: sectionMeta[sectionId].description,
      models: (sectionBuckets.get(sectionId) ?? []).sort((left, right) => {
        const providerDiff = left.provider.localeCompare(right.provider, "en");

        if (providerDiff !== 0) {
          return providerDiff;
        }

        return left.id.localeCompare(right.id, "en");
      }),
    }))
    .filter((section) => section.models.length > 0);
}

async function fetchLiveModels() {
  const baseUrl = process.env.UPSTREAM_API_BASE_URL;
  const apiKey = process.env.UPSTREAM_API_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  const response = await fetch(`${normalizeUpstreamBaseUrl(baseUrl)}/v1/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: UpstreamModel[];
  };

  if (!payload.data?.length) {
    return null;
  }

  return uniqueModels(payload.data);
}

async function buildCatalog(source: "live" | "fallback", models: UpstreamModel[]): Promise<ModelCatalog> {
  const pricingCatalog = await getPricingCatalog();
  const sections = buildSections(models, pricingCatalog);

  return {
    source,
    lastUpdated: new Date().toISOString().slice(0, 10),
    totalCount: flattenModels(sections).length,
    sections,
    suggestions: buildSuggestions(sections),
    providers: buildProviders(sections),
  };
}

export async function getModelCatalog(): Promise<ModelCatalog> {
  try {
    const liveModels = await fetchLiveModels();

    if (liveModels?.length) {
      return buildCatalog("live", liveModels);
    }
  } catch {
    // Fall through to the curated fallback catalog.
  }

  return buildCatalog("fallback", fallbackModels);
}

export async function resolveUpstreamCatalogModelId(modelId: string | null | undefined) {
  const requested = modelId?.trim();

  if (!requested) {
    return null;
  }

  const catalog = await getModelCatalog();
  const match = findCatalogModelById(catalog, requested);

  if (!match) {
    return requested;
  }

  const matchingAlias = match.aliases.find(
    (alias) => alias.toLowerCase() === requested.toLowerCase(),
  );

  return matchingAlias ?? match.targetId;
}
