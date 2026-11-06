import Link from "next/link";
import { ArrowRight, Boxes, LayoutDashboard, Phone, PlaySquare } from "lucide-react";

import { appRoutes, productSurfaces } from "@/lib/app-routes";
import { getModelCatalog } from "@/lib/model-catalog";
import { contactPhone, siteName } from "@/lib/site-config";

const entryIcons = {
  [appRoutes.models]: Boxes,
  [appRoutes.playground]: PlaySquare,
  [appRoutes.workspace]: LayoutDashboard,
} as const;

export default async function HomePage() {
  const catalog = await getModelCatalog();

  return (
    <section className="site-shell section-space">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-8 py-4 sm:py-8 xl:py-12">
          <div className="inline-flex items-center rounded-full border border-[var(--line)] bg-[color:rgba(255,255,255,0.7)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {siteName}
          </div>

          <div className="space-y-5">
            <h1 className="max-w-5xl font-display text-5xl font-semibold leading-none text-[var(--ink)] sm:text-6xl xl:text-[5.2rem]">
              统一模型入口
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              浏览模型，在线体验，集中管理平台 Key。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={appRoutes.playground} className="primary-button">
              进入 Playground
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={appRoutes.models} className="subtle-button">
              查看模型列表
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.68)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Models
              </div>
              <div className="mt-3 font-display text-3xl font-semibold text-[var(--ink)]">
                {catalog.totalCount}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.68)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Categories
              </div>
              <div className="mt-3 font-display text-3xl font-semibold text-[var(--ink)]">
                {catalog.sections.length}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.68)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Contact
              </div>
              <div className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--ink)]">
                <Phone className="h-4 w-4" />
                <span>{contactPhone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 xl:py-12">
          {productSurfaces.map((entry, index) => {
            const Icon = entryIcons[entry.href];

            return (
              <Link
                key={entry.href}
                href={entry.href}
                className="group block rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.72)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[0_18px_42px_rgba(17,17,15,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    0{index + 1}
                  </span>
                </div>

                <h2 className="mt-5 font-display text-3xl font-semibold text-[var(--ink)]">
                  {entry.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{entry.body}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
