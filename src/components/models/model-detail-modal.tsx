"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  KeyRound,
  Layers3,
  X,
} from "lucide-react";

import { ProviderMark } from "@/components/models/provider-mark";
import type { CatalogModel, WrapperRoute } from "@/lib/catalog-types";

type ModelDetailModalProps = {
  model: CatalogModel | null;
  onClose: () => void;
};

type ExampleKeyResponse = {
  apiKey: string | null;
  tokenPreview: string | null;
  hasActiveKey: boolean;
  createdAt: string | null;
};

type ExampleState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      apiKey: string | null;
      tokenPreview: string | null;
      createdAt: string | null;
      hasActiveKey: boolean;
      unauthorized: boolean;
    };

function getModeForSection(sectionId: CatalogModel["sectionId"]) {
  if (sectionId === "image") return "images";
  if (sectionId === "audio") return "audio";
  if (sectionId === "video") return "video";
  return "chat";
}

function getCategoryLabel(sectionId: CatalogModel["sectionId"]) {
  if (sectionId === "image") return "图片";
  if (sectionId === "audio") return "语音";
  if (sectionId === "video") return "视频";
  if (sectionId === "embedding") return "向量";
  if (sectionId === "utility") return "其他";
  return "文本";
}

function getRouteTitle(route: WrapperRoute) {
  if (route === "/v1/chat/completions") return "Chat Completions";
  if (route === "/v1/responses") return "Responses";
  if (route === "/v1/messages") return "Messages";
  if (route === "/v1/images/generations") return "Images";
  return "Audio";
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return null;
  }

  return value.slice(0, 10).replaceAll("-", ".");
}

function formatPricingDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  return value.slice(0, 10).replaceAll("-", ".");
}

function formatPriceValue(value: number | null) {
  if (value === null) {
    return "--";
  }

  return `¥${Number(value.toFixed(6))}`;
}

function buildPayloadExample(modelId: string, route: WrapperRoute) {
  if (route === "/v1/chat/completions") {
    return JSON.stringify(
      {
        model: modelId,
        messages: [{ role: "user", content: "Hello" }],
      },
      null,
      2,
    );
  }

  if (route === "/v1/responses") {
    return JSON.stringify(
      {
        model: modelId,
        input: "Hello",
      },
      null,
      2,
    );
  }

  if (route === "/v1/messages") {
    return JSON.stringify(
      {
        model: modelId,
        max_tokens: 256,
        messages: [{ role: "user", content: "Hello" }],
      },
      null,
      2,
    );
  }

  if (route === "/v1/images/generations") {
    return JSON.stringify(
      {
        model: modelId,
        prompt: "A clean product poster",
      },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      model: modelId,
      voice: "alloy",
      input: "Welcome to Apsation API",
    },
    null,
    2,
  );
}

function buildCurlExample(
  origin: string,
  modelId: string,
  route: WrapperRoute,
  apiKey: string,
) {
  return [
    `curl ${origin}${route} \\`,
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${buildPayloadExample(modelId, route)}'`,
  ].join("\n");
}

export function ModelDetailModal({ model, onClose }: ModelDetailModalProps) {
  const [showExamples, setShowExamples] = useState(false);
  const [exampleState, setExampleState] = useState<ExampleState>({ status: "idle" });
  const [selectedRoute, setSelectedRoute] = useState<WrapperRoute | null>(null);
  const [copiedRoute, setCopiedRoute] = useState<WrapperRoute | null>(null);

  useEffect(() => {
    if (!model) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [model, onClose]);

  if (!model) {
    return null;
  }

  const activeModel = model;

  const origin =
    typeof window === "undefined" ? "https://your-domain.com" : window.location.origin;
  const activeRoute =
    selectedRoute && activeModel.supportedRoutes.includes(selectedRoute)
      ? selectedRoute
      : (activeModel.supportedRoutes[0] ?? null);
  const playgroundHref = `/playground?mode=${getModeForSection(activeModel.sectionId)}&model=${encodeURIComponent(
    activeModel.id,
  )}`;
  const routeCode =
    exampleState.status === "ready" && activeRoute
      ? buildCurlExample(
          origin,
          activeModel.id,
          activeRoute,
          "YOUR_APSATION_API_KEY",
        )
      : null;

  async function loadExamples() {
    setExampleState({ status: "loading" });

    try {
      const response = await fetch("/api/workspace/keys/example", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401) {
        setExampleState({
          status: "ready",
          apiKey: null,
          tokenPreview: null,
          createdAt: null,
          hasActiveKey: false,
          unauthorized: true,
        });
        return;
      }

      const payload = (await response.json().catch(() => null)) as ExampleKeyResponse | null;

      setExampleState({
        status: "ready",
        apiKey: payload?.apiKey ?? null,
        tokenPreview: payload?.tokenPreview ?? null,
        createdAt: payload?.createdAt ?? null,
        hasActiveKey: payload?.hasActiveKey ?? false,
        unauthorized: false,
      });
    } catch {
      setExampleState({
        status: "ready",
        apiKey: null,
        tokenPreview: null,
        createdAt: null,
        hasActiveKey: false,
        unauthorized: false,
      });
    }
  }

  async function handleToggleExamples() {
    const nextValue = !showExamples;
    setShowExamples(nextValue);

    if (
      !nextValue ||
      !activeModel.supportedRoutes.length ||
      exampleState.status !== "idle"
    ) {
      return;
    }

    await loadExamples();
  }

  async function handleCopyCode() {
    if (!routeCode || !activeRoute) {
      return;
    }

    try {
      await navigator.clipboard.writeText(routeCode);
      setCopiedRoute(activeRoute);
      window.setTimeout(() => {
        setCopiedRoute((current) => (current === activeRoute ? null : current));
      }, 1600);
    } catch {
      setCopiedRoute(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:rgba(17,17,15,0.48)] px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-[1080px] overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--panel-strong)] shadow-[0_28px_100px_rgba(17,17,15,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <ProviderMark
              providerId={activeModel.providerId}
              providerLabel={activeModel.provider}
            />
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                {activeModel.provider}
              </div>
              <h2 className="font-display text-3xl font-semibold text-[var(--ink)]">
                {activeModel.id}
              </h2>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span className="rounded-full border border-[var(--line)] px-3 py-1">
                  {getCategoryLabel(activeModel.sectionId)}
                </span>
                <span className="rounded-full border border-[var(--line)] px-3 py-1">
                  {activeModel.supportedRoutes.length} 种调用格式
                </span>
                {activeModel.variantCount > 0 ? (
                  <span className="rounded-full border border-[var(--line)] px-3 py-1">
                    收起 {activeModel.variantCount} 个细分版本
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--muted)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-96px)] overflow-y-auto p-6 sm:p-7">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <section className="rounded-[1.5rem] border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                  <Layers3 className="h-4 w-4" />
                  支持协议
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeModel.endpoints.map((endpoint) => (
                    <span
                      key={`${activeModel.id}-${endpoint}`}
                      className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]"
                    >
                      {endpoint}
                    </span>
                  ))}
                </div>
              </section>

              {activeModel.variantCount > 0 ? (
                <section className="rounded-[1.5rem] border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-5">
                  <div className="text-sm font-medium text-[var(--ink)]">已归并版本</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {activeModel.aliases.map((alias) => (
                      <span
                        key={alias}
                        className={`rounded-full px-3 py-1 text-xs ${
                          alias === activeModel.id
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "border border-[var(--line)] text-[var(--muted)]"
                        }`}
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="rounded-[1.5rem] border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[var(--ink)]">模型定价</div>
                  {activeModel.pricing ? (
                    <div className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">
                      价格同步 {formatPricingDate(activeModel.pricing.sourceUpdatedAt)}
                    </div>
                  ) : null}
                </div>

                {activeModel.pricing ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {activeModel.pricing.quotaType === "fixed" ? (
                      <div className="rounded-lg border border-[var(--line)] bg-white/70 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          固定计费
                        </div>
                        <div className="mt-3 text-xl font-semibold text-[var(--ink)]">
                          {formatPriceValue(activeModel.pricing.fixedPrice)}/
                          {activeModel.pricing.fixedUnit ?? "request"}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-lg border border-[var(--line)] bg-white/70 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                            输入
                          </div>
                          <div className="mt-3 text-xl font-semibold text-[var(--ink)]">
                            {formatPriceValue(activeModel.pricing.inputPerMillion)}/1M tokens
                          </div>
                        </div>
                        <div className="rounded-lg border border-[var(--line)] bg-white/70 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                            输出
                          </div>
                          <div className="mt-3 text-xl font-semibold text-[var(--ink)]">
                            {formatPriceValue(activeModel.pricing.outputPerMillion)}/1M tokens
                          </div>
                        </div>
                        {activeModel.pricing.cachedInputPerMillion !== null ? (
                          <div className="rounded-lg border border-[var(--line)] bg-white/70 p-4">
                            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                              缓存命中
                            </div>
                            <div className="mt-3 text-xl font-semibold text-[var(--ink)]">
                              {formatPriceValue(activeModel.pricing.cachedInputPerMillion)}/1M tokens
                            </div>
                          </div>
                        ) : null}
                        {activeModel.pricing.cacheCreationPerMillion !== null ? (
                          <div className="rounded-lg border border-[var(--line)] bg-white/70 p-4">
                            <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                              缓存写入
                            </div>
                            <div className="mt-3 text-xl font-semibold text-[var(--ink)]">
                              {formatPriceValue(activeModel.pricing.cacheCreationPerMillion)}/1M tokens
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.2rem] bg-[color:rgba(17,17,15,0.04)] px-4 py-3 text-sm text-[var(--muted)]">
                    暂未从平台价格表匹配到这个模型。
                  </div>
                )}

                {activeModel.aliasPricings.length > 1 ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-[var(--line)]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[color:rgba(16,16,16,0.03)] text-[var(--muted)]">
                        <tr>
                          <th className="px-3 py-2 font-medium">版本</th>
                          <th className="px-3 py-2 font-medium">输入/固定</th>
                          <th className="px-3 py-2 font-medium">输出</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeModel.aliasPricings.slice(0, 12).map((pricing) => (
                          <tr key={pricing.modelId} className="border-t border-[var(--line)]">
                            <td className="break-all px-3 py-2 text-[var(--ink)]">
                              {pricing.modelId}
                            </td>
                            <td className="px-3 py-2 text-[var(--muted)]">
                              {pricing.quotaType === "fixed"
                                ? `${formatPriceValue(pricing.fixedPrice)}/${
                                    pricing.fixedUnit ?? "request"
                                  }`
                                : `${formatPriceValue(pricing.inputPerMillion)}/1M`}
                            </td>
                            <td className="px-3 py-2 text-[var(--muted)]">
                              {pricing.quotaType === "fixed"
                                ? "--"
                                : `${formatPriceValue(pricing.outputPerMillion)}/1M`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>

              {showExamples ? (
                <section className="rounded-[1.5rem] border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-medium text-[var(--ink)]">调用示例</div>
                    {exampleState.status === "ready" && exampleState.apiKey ? (
                      <div className="rounded-full bg-[color:rgba(16,104,74,0.1)] px-3 py-1 text-xs text-[var(--success)]">
                        已填入当前用户 Key
                      </div>
                    ) : null}
                  </div>

                  {!activeModel.supportedRoutes.length ? (
                    <div className="mt-4 rounded-[1.2rem] bg-[color:rgba(17,17,15,0.04)] px-4 py-3 text-sm text-[var(--muted)]">
                      这个模型分类暂未开放对应的 Wrapper API。
                    </div>
                  ) : null}

                  {activeModel.supportedRoutes.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeModel.supportedRoutes.map((route) => (
                        <button
                          key={route}
                          type="button"
                          onClick={() => setSelectedRoute(route)}
                          className={`rounded-full px-4 py-2 text-sm ${
                            activeRoute === route
                              ? "bg-[var(--ink)] text-white"
                              : "border border-[var(--line)] bg-white text-[var(--muted)]"
                          }`}
                        >
                          {getRouteTitle(route)}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {exampleState.status === "loading" ? (
                    <div className="mt-4 text-sm text-[var(--muted)]">正在读取示例 Key...</div>
                  ) : null}

                  {exampleState.status === "ready" && exampleState.unauthorized ? (
                    <div className="mt-4 rounded-[1.2rem] bg-[color:rgba(178,68,37,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                      登录后才能查看带用户 Key 的调用示例。
                    </div>
                  ) : null}

                  {exampleState.status === "ready" &&
                  !exampleState.unauthorized &&
                  !exampleState.hasActiveKey ? (
                    <div className="mt-4 rounded-[1.2rem] bg-[color:rgba(178,68,37,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                      当前没有可用平台 Key，请先到工作台创建。
                    </div>
                  ) : null}

                  {exampleState.status === "ready" &&
                  !exampleState.unauthorized &&
                  exampleState.hasActiveKey &&
                  !exampleState.apiKey ? (
                    <div className="mt-4 rounded-[1.2rem] bg-[color:rgba(19,82,239,0.08)] px-4 py-3 text-sm text-[var(--ink)]">
                      当前活跃 Key 无法完整回显，先展示标准示例格式。
                      {exampleState.tokenPreview ? ` 当前预览：${exampleState.tokenPreview}` : ""}
                    </div>
                  ) : null}

                  {routeCode ? (
                    <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[color:rgba(17,17,15,0.96)] text-white">
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-white/55">
                            {activeRoute ? getRouteTitle(activeRoute) : "API"}
                          </div>
                          <div className="mt-1 text-sm text-white/78">{activeRoute}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleCopyCode()}
                          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs text-white"
                        >
                          {copiedRoute === activeRoute ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedRoute === activeRoute ? "已复制" : "复制示例"}
                        </button>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-all p-4 text-[12px] leading-6 text-white/90">
                        {routeCode}
                      </pre>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>

            <aside className="space-y-4">
              <section className="rounded-[1.5rem] border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-5">
                <div className="text-sm font-medium text-[var(--ink)]">快捷操作</div>
                <div className="mt-4 grid gap-3">
                  <Link href={playgroundHref} className="primary-button justify-center">
                    在线体验
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleToggleExamples()}
                    className="subtle-button justify-center"
                  >
                    <Code2 className="h-4 w-4" />
                    {showExamples ? "收起调用示例" : "显示调用示例"}
                  </button>
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-5">
                <div className="text-sm font-medium text-[var(--ink)]">当前模型</div>
                <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
                  <div className="flex items-center justify-between gap-3">
                    <span>厂商</span>
                    <span className="text-[var(--ink)]">{activeModel.provider}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>分类</span>
                    <span className="text-[var(--ink)]">
                      {getCategoryLabel(activeModel.sectionId)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>主模型</span>
                    <span className="text-[var(--ink)]">{activeModel.id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>细分版本</span>
                    <span className="text-[var(--ink)]">{activeModel.aliases.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>调用格式</span>
                    <span className="text-[var(--ink)]">
                      {activeModel.supportedRoutes.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>示例 Key</span>
                    <span className="text-[var(--ink)]">
                      {exampleState.status === "ready" && exampleState.tokenPreview
                        ? exampleState.tokenPreview
                        : "--"}
                    </span>
                  </div>
                  {exampleState.status === "ready" && exampleState.createdAt ? (
                    <div className="flex items-center justify-between gap-3">
                      <span>创建时间</span>
                      <span className="text-[var(--ink)]">
                        {formatDateLabel(exampleState.createdAt)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-5">
                <div className="text-sm font-medium text-[var(--ink)]">Key 管理</div>
                <Link
                  href="/workspace/keys"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--ink)] underline underline-offset-4"
                >
                  <KeyRound className="h-4 w-4" />
                  打开平台 Key
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
