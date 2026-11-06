"use client";

import { startTransition, useDeferredValue, useState } from "react";
import { Filter, RotateCcw, Search } from "lucide-react";

import { ModelDetailModal } from "@/components/models/model-detail-modal";
import { ProviderMark } from "@/components/models/provider-mark";
import type { CatalogModel, ModelCatalog, ModelSectionId } from "@/lib/catalog-types";

type ModelsCatalogProps = {
  catalog: ModelCatalog;
};

function formatDateLabel(value: string) {
  return value.replaceAll("-", ".");
}

function formatPriceLabel(model: CatalogModel) {
  const pricing = model.pricing;

  if (!pricing) {
    return "价格待同步";
  }

  if (pricing.quotaType === "fixed") {
    return `¥${pricing.fixedPrice ?? 0}/${pricing.fixedUnit ?? "request"}`;
  }

  return `¥${pricing.inputPerMillion ?? 0}/1M 输入 · ¥${
    pricing.outputPerMillion ?? 0
  }/1M 输出`;
}

export function ModelsCatalog({ catalog }: ModelsCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<ModelSectionId | "all">("all");
  const [activeProvider, setActiveProvider] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<CatalogModel | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const visibleSections = catalog.sections
    .map((section) => {
      const matchesSection = activeSection === "all" || section.id === activeSection;
      const models = section.models.filter((model) => {
        const matchesProvider =
          activeProvider === "all" || model.providerId === activeProvider;
        const matchesQuery =
          deferredQuery.length === 0 ||
          model.id.toLowerCase().includes(deferredQuery) ||
          model.provider.toLowerCase().includes(deferredQuery) ||
          model.aliases.some((alias) => alias.toLowerCase().includes(deferredQuery)) ||
          model.endpoints.some((endpoint) => endpoint.toLowerCase().includes(deferredQuery));

        return matchesSection && matchesProvider && matchesQuery;
      });

      return {
        ...section,
        models,
      };
    })
    .filter((section) => section.models.length > 0);

  const visibleCount = visibleSections.reduce(
    (sum, section) => sum + section.models.length,
    0,
  );
  const hasActiveFilters =
    query.trim().length > 0 || activeSection !== "all" || activeProvider !== "all";

  function resetFilters() {
    setQuery("");
    setActiveSection("all");
    setActiveProvider("all");
  }

  return (
    <>
      <section className="site-shell section-space space-y-4">
        <div className="panel overflow-hidden">
          <div className="space-y-6 p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="eyebrow">Models</div>
                <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
                  模型列表
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">
                  同系列细分版本已自动收起，只保留可直接使用的主版本入口。
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-[var(--ink)]">
                  当前展示 {visibleCount}
                </span>
                <span className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-[var(--ink)]">
                  厂商 {catalog.providers.length}
                </span>
                <span className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-[var(--muted)]">
                  更新于 {formatDateLabel(catalog.lastUpdated)}
                </span>
              </div>
            </div>

            <div className="grid gap-4 border-t border-[var(--line)] pt-5">
              <label className="flex items-center gap-3 rounded-[1.35rem] border border-[var(--line)] bg-[color:rgba(255,255,255,0.72)] px-4 py-3">
                <Search className="h-4 w-4 text-[var(--muted)]" />
                <input
                  value={query}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    startTransition(() => {
                      setQuery(nextValue);
                    });
                  }}
                  placeholder="搜索模型 / 厂商 / 历史版本"
                  className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                />
              </label>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    <Filter className="h-3.5 w-3.5" />
                    分类筛选
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSection("all")}
                      className={`rounded-full px-4 py-2 text-sm ${
                        activeSection === "all"
                          ? "bg-[var(--ink)] text-white"
                          : "border border-[var(--line)] bg-white/65 text-[var(--muted)]"
                      }`}
                    >
                      全部分类
                    </button>
                    {catalog.sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className={`rounded-full px-4 py-2 text-sm ${
                          activeSection === section.id
                            ? "bg-[var(--ink)] text-white"
                            : "border border-[var(--line)] bg-white/65 text-[var(--muted)]"
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    厂商筛选
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveProvider("all")}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                        activeProvider === "all"
                          ? "bg-[var(--ink)] text-white"
                          : "border border-[var(--line)] bg-white/65 text-[var(--muted)]"
                      }`}
                    >
                      全部厂商
                    </button>
                    {catalog.providers.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setActiveProvider(provider.id)}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm ${
                          activeProvider === provider.id
                            ? "bg-[var(--ink)] text-white"
                            : "border border-[var(--line)] bg-white/65 text-[var(--muted)]"
                        }`}
                      >
                        <ProviderMark
                          providerId={provider.id}
                          providerLabel={provider.label}
                          size="sm"
                        />
                        <span>{provider.label}</span>
                        <span className="opacity-70">{provider.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {hasActiveFilters ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-[var(--line)] bg-white/55 px-4 py-3">
                  <div className="flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                    {query.trim() ? (
                      <span className="rounded-full border border-[var(--line)] px-3 py-1">
                        关键词 {query.trim()}
                      </span>
                    ) : null}
                    {activeSection !== "all" ? (
                      <span className="rounded-full border border-[var(--line)] px-3 py-1">
                        分类 {catalog.sections.find((section) => section.id === activeSection)?.title}
                      </span>
                    ) : null}
                    {activeProvider !== "all" ? (
                      <span className="rounded-full border border-[var(--line)] px-3 py-1">
                        厂商 {catalog.providers.find((provider) => provider.id === activeProvider)?.label}
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 text-sm text-[var(--ink)]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    清空筛选
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {visibleSections.length ? (
          visibleSections.map((section) => (
            <section key={section.id} className="panel overflow-hidden">
              <div className="grid gap-0 xl:grid-cols-[220px_minmax(0,1fr)]">
                <div className="border-b border-[var(--line)] p-5 sm:p-6 xl:border-b-0 xl:border-r">
                  <div className="space-y-3">
                    <h2 className="font-display text-3xl font-semibold text-[var(--ink)]">
                      {section.title}
                    </h2>
                    <p className="text-sm leading-7 text-[var(--muted)]">
                      {section.description}
                    </p>
                    <div className="inline-flex rounded-full border border-[var(--line)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      {section.models.length} Models
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4">
                  <div className="grid auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
                    {section.models.map((model) => (
                      <button
                        key={`${section.id}-${model.id}`}
                        type="button"
                        onClick={() => setSelectedModel(model)}
                        className="group flex h-full rounded-xl border border-[var(--line)] bg-[color:rgba(255,255,255,0.74)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[0_18px_42px_rgba(17,17,15,0.06)]"
                      >
                        <div className="flex h-full w-full items-start gap-4">
                          <ProviderMark
                            providerId={model.providerId}
                            providerLabel={model.provider}
                          />

                          <div className="flex min-h-[250px] min-w-0 flex-1 flex-col">
                            <div className="space-y-2">
                              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                                {model.provider}
                              </div>
                              <h3 className="line-clamp-2 break-all text-lg font-semibold leading-6 text-[var(--ink)]">
                                {model.id}
                              </h3>
                            </div>

                            <div className="mt-4 flex min-h-[30px] flex-wrap content-start gap-2">
                              {model.endpoints.map((endpoint) => (
                                <span
                                  key={`${model.id}-${endpoint}`}
                                  className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--muted)]"
                                >
                                  {endpoint}
                                </span>
                              ))}
                            </div>

                            <div className="mt-4 flex min-h-[68px] flex-wrap content-start gap-2 text-xs">
                              <span className="rounded-lg bg-[var(--accent-soft)] px-3 py-1 text-[var(--accent)]">
                                {model.supportedRoutes.length} 种调用
                              </span>
                              <span className="rounded-lg border border-[var(--line)] px-3 py-1 text-[var(--ink)]">
                                {formatPriceLabel(model)}
                              </span>
                              {model.variantCount > 0 ? (
                                <span className="rounded-lg border border-[var(--line)] px-3 py-1 text-[var(--muted)]">
                                  收起 {model.variantCount} 个版本
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-auto border-t border-[var(--line)] pt-4 text-sm font-medium text-[var(--ink)]">
                              查看详情
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))
        ) : (
          <section className="panel p-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">
              没有结果
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              换一个关键词，或者清空当前筛选条件。
            </p>
          </section>
        )}
      </section>

      <ModelDetailModal
        key={selectedModel?.id ?? "empty"}
        model={selectedModel}
        onClose={() => setSelectedModel(null)}
      />
    </>
  );
}
