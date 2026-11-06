"use client";

import { useEffect, useState } from "react";
import {
  AudioLines,
  Boxes,
  ImageIcon,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  SendHorizontal,
  SlidersHorizontal,
  Sparkles,
  Video,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { appRoutes } from "@/lib/app-routes";
import { ProviderMark } from "@/components/models/provider-mark";
import type { CatalogSection, CatalogModel, ModelSuggestions } from "@/lib/catalog-types";
import { playgroundModes } from "@/lib/playground-config";

type PublicModeId = "chat" | "responses" | "images" | "audio" | "video";

type PlaygroundWorkbenchProps = {
  catalogSections: CatalogSection[];
  modelSuggestions: ModelSuggestions;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: boolean;
};

type MediaRun = {
  id: string;
  mode: Exclude<PublicModeId, "chat" | "responses">;
  prompt: string;
  model: string;
  ok: boolean;
  status: number;
  data: unknown;
};

type FormState = {
  model: string;
  prompt: string;
  system: string;
  reasoningEffort: "low" | "medium" | "high" | "xhigh";
  verbosity: "low" | "medium" | "high";
  size: string;
  voice: string;
  duration: string;
  aspectRatio: string;
};

const visibleModes = playgroundModes.filter(
  (mode): mode is (typeof playgroundModes)[number] & { id: PublicModeId } => mode.visible,
);

const modeIcons = {
  chat: MessageSquareText,
  responses: Sparkles,
  images: ImageIcon,
  audio: AudioLines,
  video: Video,
} as const;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getSuggestionsForMode(modeId: PublicModeId, suggestions: ModelSuggestions) {
  switch (modeId) {
    case "images":
      return suggestions.images;
    case "audio":
      return suggestions.audio;
    case "video":
      return suggestions.video;
    case "responses":
      return suggestions.chat;
    case "chat":
    default:
      return suggestions.chat;
  }
}

function getSectionIdForMode(modeId: PublicModeId) {
  if (modeId === "images") return "image";
  if (modeId === "audio") return "audio";
  if (modeId === "video") return "video";
  return "text";
}

function getRouteForMode(modeId: PublicModeId) {
  if (modeId === "chat") return "/v1/chat/completions";
  if (modeId === "responses") return "/v1/responses";
  if (modeId === "images") return "/v1/images/generations";
  if (modeId === "audio") return "/v1/audio/speech";
  return null;
}

function getCatalogModelsForMode(modeId: PublicModeId, sections: CatalogSection[]) {
  const sectionId = getSectionIdForMode(modeId);
  const route = getRouteForMode(modeId);
  const models = sections.find((section) => section.id === sectionId)?.models ?? [];
  const filtered = route
    ? models.filter(
        (model) =>
          model.supportedRoutes.length === 0 || model.supportedRoutes.includes(route),
      )
    : models;

  return filtered.length ? filtered : models;
}

function findCatalogModel(modelId: string, models: CatalogModel[]) {
  const requested = modelId.trim().toLowerCase();

  return (
    models.find(
      (model) =>
        model.id.toLowerCase() === requested ||
        model.targetId.toLowerCase() === requested ||
        model.aliases.some((alias) => alias.toLowerCase() === requested),
    ) ?? null
  );
}

function getProviderOptions(models: CatalogModel[]) {
  const providers = new Map<string, { id: string; label: string; count: number }>();

  for (const model of models) {
    const current = providers.get(model.providerId);

    if (current) {
      current.count += 1;
      continue;
    }

    providers.set(model.providerId, {
      id: model.providerId,
      label: model.provider,
      count: 1,
    });
  }

  return [...providers.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.label.localeCompare(right.label, "en");
  });
}

function getDefaultForm(
  modeId: PublicModeId,
  suggestions: ModelSuggestions,
  preferredModel?: string | null,
): FormState {
  const mode = visibleModes.find((item) => item.id === modeId) ?? visibleModes[0];
  const firstSuggestedModel =
    preferredModel?.trim() ||
    getSuggestionsForMode(modeId, suggestions)[0] ||
    mode.defaultModel;

  return {
    model: firstSuggestedModel,
    prompt: "",
    system: mode.systemPrompt ?? "You are a concise assistant.",
    reasoningEffort: "medium",
    verbosity: "medium",
    size: "1024x1024",
    voice: "alloy",
    duration: "8",
    aspectRatio: "16:9",
  };
}

function resolveRequestedMode(input: string | null): PublicModeId {
  if (
    input === "images" ||
    input === "audio" ||
    input === "video" ||
    input === "chat" ||
    input === "responses"
  ) {
    return input;
  }

  return "responses";
}

function extractChatText(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const output = payload.output as
    | Array<{
        content?: Array<{ text?: string; type?: string }>;
      }>
    | undefined;
  const outputText = output
    ?.flatMap((item) => item.content ?? [])
    .map((item) => item.text ?? "")
    .filter(Boolean)
    .join("\n");

  if (outputText) {
    return outputText;
  }

  const choices = payload.choices as
    | Array<{
        message?: {
          content?:
            | string
            | Array<{ type?: string; text?: string; content?: string }>;
        };
      }>
    | undefined;

  const content = choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? item.content ?? "")
      .filter(Boolean)
      .join("\n");
  }

  return null;
}

function extractImageUrl(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;
  const entries = payload.data as Array<Record<string, unknown>> | undefined;
  const first = entries?.[0];

  if (typeof first?.url === "string") {
    return first.url;
  }

  if (typeof first?.b64_json === "string") {
    return `data:image/png;base64,${first.b64_json}`;
  }

  return null;
}

function extractAudioUrl(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.base64 === "string" && typeof payload.mimeType === "string") {
    return `data:${payload.mimeType};base64,${payload.base64}`;
  }

  return null;
}

function extractVideoUrl(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;
  const directUrl =
    payload.url ??
    payload.video_url ??
    payload.videoUrl ??
    payload.output_url ??
    payload.outputUrl;

  if (typeof directUrl === "string") {
    return directUrl;
  }

  const entries = payload.data as Array<Record<string, unknown>> | undefined;
  const first = entries?.[0];

  if (typeof first?.url === "string") {
    return first.url;
  }

  return null;
}

function extractTaskLabel(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.task_id === "string") {
    return `任务 ID: ${payload.task_id}`;
  }

  if (typeof payload.id === "string") {
    return `结果 ID: ${payload.id}`;
  }

  if (typeof payload.status === "string") {
    return `状态: ${payload.status}`;
  }

  return null;
}

function extractErrorText(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;
  const error = payload.error;

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return null;
}

function buildPayload(
  modeId: PublicModeId,
  form: FormState,
  chatMessages: ChatMessage[],
  nextPrompt: string,
) {
  if (modeId === "chat") {
    return {
      model: form.model,
      messages: [
        ...(form.system ? [{ role: "system", content: form.system }] : []),
        ...chatMessages
          .filter((message) => !message.pending && !message.error)
          .map((message) => ({
            role: message.role,
            content: message.content,
          })),
        { role: "user", content: nextPrompt },
      ],
      stream: false,
    };
  }

  if (modeId === "responses") {
    return {
      model: form.model,
      input: [
        ...(form.system ? [{ role: "system", content: form.system }] : []),
        ...chatMessages
          .filter((message) => !message.pending && !message.error)
          .map((message) => ({
            role: message.role,
            content: message.content,
          })),
        { role: "user", content: nextPrompt },
      ],
      reasoning: {
        effort: form.reasoningEffort,
      },
      text: {
        verbosity: form.verbosity,
      },
    };
  }

  if (modeId === "images") {
    return {
      model: form.model,
      prompt: nextPrompt,
      size: form.size,
    };
  }

  if (modeId === "audio") {
    return {
      model: form.model,
      voice: form.voice,
      input: nextPrompt,
    };
  }

  return {
    model: form.model,
    prompt: nextPrompt,
    duration: Number(form.duration),
    aspect_ratio: form.aspectRatio,
  };
}

export function PlaygroundWorkbench({
  catalogSections,
  modelSuggestions,
}: PlaygroundWorkbenchProps) {
  const searchParams = useSearchParams();
  const requestedMode = resolveRequestedMode(searchParams.get("mode"));
  const requestedModel = searchParams.get("model");
  const [selectedId, setSelectedId] = useState<PublicModeId>(requestedMode);
  const [form, setForm] = useState<FormState>(
    getDefaultForm(requestedMode, modelSuggestions, requestedModel),
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [mediaRuns, setMediaRuns] = useState<MediaRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(requestedMode);
    setForm(getDefaultForm(requestedMode, modelSuggestions, requestedModel));
    setChatMessages([]);
    setMediaRuns([]);
    setProviderFilter(null);
  }, [requestedMode, requestedModel, modelSuggestions]);

  const selectedMode = visibleModes.find((mode) => mode.id === selectedId) ?? visibleModes[0];
  const currentSuggestions = getSuggestionsForMode(selectedId, modelSuggestions);
  const quickSuggestions = currentSuggestions.slice(0, 6);
  const modeModels = getCatalogModelsForMode(selectedId, catalogSections);
  const selectedCatalogModel = findCatalogModel(form.model, modeModels);
  const providerOptions = getProviderOptions(modeModels);
  const activeProviderId =
    providerFilter ?? selectedCatalogModel?.providerId ?? providerOptions[0]?.id ?? null;
  const providerModels = activeProviderId
    ? modeModels.filter((model) => model.providerId === activeProviderId)
    : modeModels;
  const activeBaseModel =
    selectedCatalogModel && providerModels.some((model) => model.id === selectedCatalogModel.id)
      ? selectedCatalogModel
      : providerModels[0] ?? selectedCatalogModel;
  const detailOptions = activeBaseModel?.aliases.length
    ? activeBaseModel.aliases
    : activeBaseModel
      ? [activeBaseModel.id]
      : [];
  const ActiveIcon = modeIcons[selectedId];
  const isTextMode = selectedId === "chat" || selectedId === "responses";

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function switchMode(nextId: PublicModeId) {
    setSelectedId(nextId);
    setForm(getDefaultForm(nextId, modelSuggestions));
    setChatMessages([]);
    setMediaRuns([]);
    setProviderFilter(null);
  }

  function resetWorkbench() {
    setForm(getDefaultForm(selectedId, modelSuggestions, form.model));
    setChatMessages([]);
    setMediaRuns([]);
  }

  function applySamplePrompt(prompt: string) {
    setForm((current) => ({ ...current, prompt }));
  }

  function selectProvider(providerId: string) {
    const nextModel = modeModels.find((model) => model.providerId === providerId);

    setProviderFilter(providerId);

    if (nextModel) {
      setForm((current) => ({
        ...current,
        model: nextModel.id,
      }));
    }
  }

  function selectBaseModel(modelId: string) {
    const nextModel = providerModels.find((model) => model.id === modelId);

    if (nextModel) {
      setForm((current) => ({
        ...current,
        model: nextModel.id,
      }));
    }
  }

  function applyOutcomeTemplate() {
    setForm((current) => ({
      ...current,
      prompt:
        "目标：\n成功标准：\n必要上下文：\n约束：\n输出格式：",
    }));
  }

  async function runMode(promptOverride?: string) {
    const prompt = (promptOverride ?? form.prompt).trim();

    if (!prompt || isRunning) {
      return;
    }

    if (isTextMode) {
      const nextUserMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: prompt,
      };
      const pendingAssistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: "生成中...",
        pending: true,
      };

      const history = [...chatMessages, nextUserMessage];
      setChatMessages([...history, pendingAssistantMessage]);
      setForm((current) => ({ ...current, prompt: "" }));
      setIsRunning(true);

      try {
        const response = await fetch(appRoutes.apiPlayground, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            modeId: selectedId,
            payload: buildPayload(selectedId, form, chatMessages, prompt),
          }),
        });

        const data = (await response.json()) as unknown;
        const content =
          extractChatText(data) ??
          extractErrorText(data) ??
          (response.ok ? "已收到结果。" : "请求失败。");

        setChatMessages([
          ...history,
          {
            id: pendingAssistantMessage.id,
            role: "assistant",
            content,
            error: !response.ok,
          },
        ]);
      } catch (error) {
        setChatMessages([
          ...history,
          {
            id: pendingAssistantMessage.id,
            role: "assistant",
            content: error instanceof Error ? error.message : "请求执行失败。",
            error: true,
          },
        ]);
      } finally {
        setIsRunning(false);
      }

      return;
    }

    const mediaMode = selectedId as Exclude<PublicModeId, "chat" | "responses">;

    setIsRunning(true);
    setForm((current) => ({ ...current, prompt: promptOverride ? current.prompt : "" }));

    try {
      const response = await fetch(appRoutes.apiPlayground, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modeId: selectedId,
          payload: buildPayload(selectedId, form, [], prompt),
        }),
      });

      const data = (await response.json()) as unknown;
      setMediaRuns((current) => [
        {
          id: createMessageId(),
          mode: mediaMode,
          prompt,
          model: form.model,
          ok: response.ok,
          status: response.status,
          data,
        },
        ...current,
      ]);
    } catch (error) {
      setMediaRuns((current) => [
        {
          id: createMessageId(),
          mode: mediaMode,
          prompt,
          model: form.model,
          ok: false,
          status: 502,
          data: {
            error: error instanceof Error ? error.message : "请求执行失败。",
          },
        },
        ...current,
      ]);
    } finally {
      setIsRunning(false);
    }
  }

  function handleChatKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void runMode();
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-[var(--line)] p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="eyebrow">Playground</div>
            <h1 className="font-display text-3xl font-semibold text-[var(--ink)] sm:text-4xl">
              GPT-5.5 Playground
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              用目标、成功标准和输出形态组织请求；推理强度与详细度可在右侧调整。
            </p>
          </div>

          <button
            type="button"
            onClick={resetWorkbench}
            className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--line)] bg-white/65 px-4 py-2 text-sm text-[var(--ink)]"
          >
            <RotateCcw className="h-4 w-4" />
            清空当前内容
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.5)] p-1.5">
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
            {visibleModes.map((mode) => {
              const active = mode.id === selectedId;
              const Icon = modeIcons[mode.id];

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => switchMode(mode.id)}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    active
                      ? "bg-[var(--ink)] text-white"
                      : "text-[var(--muted)] hover:bg-white/78 hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="p-4 lg:p-5">
          <div className="flex min-h-[680px] flex-col rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.52)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {isTextMode ? (
                chatMessages.length ? (
                  <div className="space-y-4">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[78%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-7 ${
                            message.role === "user"
                              ? "bg-[var(--ink)] text-white"
                              : message.error
                                ? "border border-[color:rgba(178,68,37,0.18)] bg-[color:rgba(178,68,37,0.08)] text-[var(--danger)]"
                                : "border border-[var(--line)] bg-[color:rgba(255,255,255,0.86)] text-[var(--ink)]"
                          }`}
                        >
                          {message.pending ? (
                            <span className="inline-flex items-center gap-2">
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              {message.content}
                            </span>
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[360px] items-center justify-center">
                    <div className="max-w-[560px] space-y-4 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                        <ActiveIcon className="h-6 w-6" />
                      </div>
                      <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">
                        {selectedId === "responses" ? "用结构化目标开始" : "开始对话"}
                      </h2>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {selectedMode.samplePrompts.slice(0, 3).map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => applySamplePrompt(prompt)}
                            className="min-h-16 rounded-lg border border-[var(--line)] bg-white/76 px-3 py-2 text-left text-xs leading-5 text-[var(--ink)] hover:border-[var(--line-strong)]"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : mediaRuns.length ? (
                <div className="grid gap-4">
                  {mediaRuns.map((run) => {
                    const imageUrl = run.mode === "images" ? extractImageUrl(run.data) : null;
                    const audioUrl = run.mode === "audio" ? extractAudioUrl(run.data) : null;
                    const videoUrl = run.mode === "video" ? extractVideoUrl(run.data) : null;
                    const taskLabel = extractTaskLabel(run.data);
                    const errorText = extractErrorText(run.data);

                    return (
                      <article
                        key={run.id}
                        className="rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.76)] p-5 shadow-[0_12px_28px_rgba(17,17,15,0.04)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                              {run.model}
                            </div>
                            <p className="mt-2 text-sm leading-7 text-[var(--ink)]">
                              {run.prompt}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              run.ok
                                ? "bg-[color:rgba(16,104,74,0.1)] text-[var(--success)]"
                                : "bg-[color:rgba(178,68,37,0.1)] text-[var(--danger)]"
                            }`}
                          >
                            HTTP {run.status}
                          </span>
                        </div>

                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={run.prompt}
                            className="mt-4 w-full rounded-lg border border-[var(--line)] object-cover"
                          />
                        ) : null}

                        {audioUrl ? (
                          <div className="mt-4">
                            <audio controls className="w-full">
                              <source src={audioUrl} />
                            </audio>
                          </div>
                        ) : null}

                        {videoUrl ? (
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex rounded-lg border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink)]"
                          >
                            查看结果
                          </a>
                        ) : null}

                        {!imageUrl && !audioUrl && !videoUrl && taskLabel ? (
                          <div className="mt-4 rounded-lg bg-[color:rgba(16,16,16,0.04)] px-4 py-3 text-sm text-[var(--muted)]">
                            {taskLabel}
                          </div>
                        ) : null}

                        {!imageUrl && !audioUrl && !videoUrl && !taskLabel && errorText ? (
                          <div className="mt-4 rounded-lg bg-[color:rgba(178,68,37,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                            {errorText}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-[360px] items-center justify-center">
                  <div className="max-w-[520px] space-y-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <ActiveIcon className="h-6 w-6" />
                    </div>
                    <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">
                      等待结果
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {selectedMode.samplePrompts.slice(0, 3).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => applySamplePrompt(prompt)}
                          className="min-h-16 rounded-lg border border-[var(--line)] bg-white/76 px-3 py-2 text-left text-xs leading-5 text-[var(--ink)] hover:border-[var(--line-strong)]"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-4">
              <div className="rounded-xl border border-[var(--line)] bg-white p-3 shadow-[0_12px_30px_rgba(17,17,15,0.04)]">
                <textarea
                  value={form.prompt}
                  onChange={(event) => updateField("prompt", event.target.value)}
                  onKeyDown={isTextMode ? handleChatKeyDown : undefined}
                  placeholder={selectedMode.placeholder}
                  className="min-h-[120px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-7 text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                />

                <div className="mt-3 flex flex-wrap gap-2 px-2">
                  {selectedMode.samplePrompts.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => applySamplePrompt(prompt)}
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">
                      {selectedMode.label}
                    </span>
                    <span className="rounded-lg border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">
                      {form.model}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void runMode()}
                    disabled={isRunning}
                    className="primary-button disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRunning ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="h-4 w-4" />
                    )}
                    {isTextMode ? "发送" : "生成"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="border-t border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(255,255,255,0.28))] p-4 lg:p-5 xl:border-l xl:border-t-0">
          <div className="space-y-3">
            <section className="rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-4 shadow-[0_10px_26px_rgba(17,17,15,0.035)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  <Boxes className="h-3.5 w-3.5" />
                  模型选择
                </div>
                <span className="rounded-lg bg-[color:rgba(17,17,15,0.04)] px-2.5 py-1 text-xs text-[var(--muted)]">
                  {modeModels.length} 个
                </span>
              </div>

              {providerOptions.length ? (
                <div className="mt-4 space-y-3">
                  <div className="text-sm font-medium text-[var(--ink)]">厂商</div>
                  <div className="grid max-h-[172px] gap-2 overflow-y-auto pr-1 [grid-template-columns:repeat(auto-fit,minmax(118px,1fr))]">
                    {providerOptions.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => selectProvider(provider.id)}
                        className={`rounded-lg border px-3 py-2 text-left text-sm ${
                          activeProviderId === provider.id
                            ? "border-transparent bg-[var(--ink)] text-white"
                            : "border-[var(--line)] bg-white/76 text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <ProviderMark
                            providerId={provider.id}
                            providerLabel={provider.label}
                            size="sm"
                          />
                          <span className="min-w-0">
                            <span className="block truncate">{provider.label}</span>
                            <span className="mt-1 block text-xs opacity-70">
                              {provider.count} 个基座
                            </span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3">
                <label className="space-y-2">
                  <div className="text-sm font-medium text-[var(--ink)]">模型基座</div>
                  <select
                    value={activeBaseModel?.id ?? form.model}
                    onChange={(event) => selectBaseModel(event.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                  >
                    {providerModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <div className="text-sm font-medium text-[var(--ink)]">细分型号</div>
                  <select
                    value={
                      detailOptions.includes(form.model)
                        ? form.model
                        : activeBaseModel?.id ?? form.model
                    }
                    onChange={(event) => updateField("model", event.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                  >
                    {detailOptions.map((alias) => (
                      <option key={alias} value={alias}>
                        {alias}
                      </option>
                    ))}
                  </select>
                </label>

                <input
                  list={`model-suggestions-${selectedId}`}
                  value={form.model}
                  onChange={(event) => updateField("model", event.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.7)] px-4 py-3 font-mono text-xs text-[var(--ink)] outline-none"
                  aria-label="模型 ID"
                />
                <datalist id={`model-suggestions-${selectedId}`}>
                  {[...new Set([...currentSuggestions, ...modeModels.flatMap((model) => model.aliases)])].map(
                    (item) => (
                      <option key={item} value={item} />
                    ),
                  )}
                </datalist>
              </div>

              {quickSuggestions.length ? (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-[var(--ink)]">常用</div>
                  <div className="flex flex-wrap gap-2">
                    {quickSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => updateField("model", item)}
                      className={`rounded-lg border px-3 py-1.5 text-xs ${
                        form.model === item
                          ? "border-transparent bg-[var(--ink)] text-white"
                          : "border-[var(--line)] text-[var(--muted)]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                  </div>
                </div>
              ) : null}
            </section>

            {isTextMode ? (
              <details className="rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-4 shadow-[0_10px_26px_rgba(17,17,15,0.035)]">
                <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  系统指令
                </summary>
                <textarea
                  value={form.system}
                  onChange={(event) => updateField("system", event.target.value)}
                  className="mt-4 min-h-[132px] w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 text-[var(--ink)] outline-none"
                />
              </details>
            ) : null}

            {selectedId === "responses" ? (
              <section className="rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-4 shadow-[0_10px_26px_rgba(17,17,15,0.035)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    生成控制
                  </div>
                  <span className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs text-[var(--accent)]">
                    {form.reasoningEffort}/{form.verbosity}
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  <label className="space-y-2">
                    <div className="text-sm font-medium text-[var(--ink)]">执行深度</div>
                    <select
                      value={form.reasoningEffort}
                      onChange={(event) =>
                        updateField(
                          "reasoningEffort",
                          event.target.value as FormState["reasoningEffort"],
                        )
                      }
                      className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                    >
                      <option value="low">low · 更快</option>
                      <option value="medium">medium · 平衡</option>
                      <option value="high">high · 复杂任务</option>
                      <option value="xhigh">xhigh · 最难任务</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <div className="text-sm font-medium text-[var(--ink)]">回复长度</div>
                    <select
                      value={form.verbosity}
                      onChange={(event) =>
                        updateField("verbosity", event.target.value as FormState["verbosity"])
                      }
                      className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                    >
                      <option value="low">low · 简洁</option>
                      <option value="medium">medium · 默认</option>
                      <option value="high">high · 展开</option>
                    </select>
                  </label>
                </div>
              </section>
            ) : null}

            {isTextMode ? (
              <section className="rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-4 shadow-[0_10px_26px_rgba(17,17,15,0.035)]">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  <ListChecks className="h-3.5 w-3.5" />
                  请求结构
                </div>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
                  <div className="grid gap-2">
                    {["目标", "成功标准", "输出格式"].map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white/68 px-3 py-2"
                      >
                        <span className="text-[var(--ink)]">{item}</span>
                        <span className="text-xs text-[var(--muted)]">建议填写</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={applyOutcomeTemplate}
                    className="subtle-button w-full justify-center"
                  >
                    填入结构模板
                  </button>
                </div>
              </section>
            ) : null}

            {selectedId === "images" ? (
              <section className="rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-4 shadow-[0_10px_26px_rgba(17,17,15,0.035)]">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  尺寸
                </div>
                <select
                  value={form.size}
                  onChange={(event) => updateField("size", event.target.value)}
                  className="mt-3 w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                >
                  <option value="1024x1024">1024 x 1024</option>
                  <option value="1536x1024">1536 x 1024</option>
                  <option value="1024x1536">1024 x 1536</option>
                </select>
              </section>
            ) : null}

            {selectedId === "audio" ? (
              <section className="rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-4 shadow-[0_10px_26px_rgba(17,17,15,0.035)]">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  音色
                </div>
                <select
                  value={form.voice}
                  onChange={(event) => updateField("voice", event.target.value)}
                  className="mt-3 w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                >
                  <option value="alloy">alloy</option>
                  <option value="nova">nova</option>
                  <option value="verse">verse</option>
                </select>
              </section>
            ) : null}

            {selectedId === "video" ? (
              <section className="rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-4 shadow-[0_10px_26px_rgba(17,17,15,0.035)]">
                <div className="grid gap-3">
                  <label className="space-y-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      时长
                    </div>
                    <select
                      value={form.duration}
                      onChange={(event) => updateField("duration", event.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                    >
                      <option value="5">5 秒</option>
                      <option value="8">8 秒</option>
                      <option value="10">10 秒</option>
                    </select>
                  </label>

                  <label className="space-y-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      比例
                    </div>
                    <select
                      value={form.aspectRatio}
                      onChange={(event) => updateField("aspectRatio", event.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                    >
                      <option value="16:9">16:9</option>
                      <option value="9:16">9:16</option>
                      <option value="1:1">1:1</option>
                    </select>
                  </label>
                </div>
              </section>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
