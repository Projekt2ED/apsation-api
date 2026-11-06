export type ModelSectionId =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "embedding"
  | "utility";

export type WrapperRoute =
  | "/v1/chat/completions"
  | "/v1/responses"
  | "/v1/messages"
  | "/v1/images/generations"
  | "/v1/audio/speech";

export type CatalogModel = {
  id: string;
  targetId: string;
  provider: string;
  providerId: string;
  sectionId: ModelSectionId;
  endpoints: string[];
  supportedRoutes: WrapperRoute[];
  aliases: string[];
  variantCount: number;
  pricing: {
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
    sourceUpdatedAt: string;
  } | null;
  aliasPricings: {
    modelId: string;
    quotaType: "token" | "fixed";
    inputPerMillion: number | null;
    outputPerMillion: number | null;
    fixedPrice: number | null;
    fixedUnit: string | null;
  }[];
};

export type CatalogSection = {
  id: ModelSectionId;
  title: string;
  description: string;
  models: CatalogModel[];
};

export type ProviderOption = {
  id: string;
  label: string;
  count: number;
};

export type ModelSuggestions = {
  chat: string[];
  images: string[];
  audio: string[];
  video: string[];
};

export type ModelCatalog = {
  source: "live" | "fallback";
  lastUpdated: string;
  totalCount: number;
  sections: CatalogSection[];
  suggestions: ModelSuggestions;
  providers: ProviderOption[];
};
