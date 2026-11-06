import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { RechargeDialog } from "@/components/workspace/recharge-form";
import { requireCurrentUser } from "@/lib/auth";
import { getModelCatalog } from "@/lib/model-catalog";
import { getWorkspaceLogs, getWorkspaceOverview } from "@/lib/workspace-data";

function formatMoney(value: number | null | undefined, digits = 4) {
  if (value === null || value === undefined) {
    return "--";
  }

  return `¥${Number(value.toFixed(digits))}`;
}

function formatPrice(model: Awaited<ReturnType<typeof getModelCatalog>>["sections"][number]["models"][number]) {
  const pricing = model.pricing;

  if (!pricing) {
    return "待同步";
  }

  if (pricing.quotaType === "fixed") {
    return `${formatMoney(pricing.fixedPrice)}/${pricing.fixedUnit ?? "request"}`;
  }

  return `${formatMoney(pricing.inputPerMillion, 6)}/1M 输入 · ${formatMoney(
    pricing.outputPerMillion,
    6,
  )}/1M 输出`;
}

export default async function WorkspaceBillingPage() {
  const user = await requireCurrentUser();
  const [overview, logs, catalog] = await Promise.all([
    getWorkspaceOverview(user.id),
    getWorkspaceLogs(user.id),
    getModelCatalog(),
  ]);
  const pricedModels = catalog.sections.flatMap((section) =>
    section.models
      .filter((model) => Boolean(model.pricing))
      .map((model) => ({
        ...model,
        sectionTitle: section.title,
      })),
  );
  const recentBillableLogs = logs.filter((log) => log.billableAmount !== null).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="panel p-8">
        <WorkspacePageHeader
          title="计费"
          description="按平台价格表估算每次调用成本。当前已预留充值订单入口，支付通道后续接入。"
        />

        <div className="mt-6">
          <RechargeDialog />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">本月预估</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {formatMoney(overview.billing.monthAmount)}
            </div>
            <div className="mt-3 text-sm text-[var(--muted)]">只统计已写入计费字段的日志</div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">计费余额</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {formatMoney(overview.quota.remaining)}
            </div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              已用 {formatMoney(overview.quota.used)} / {formatMoney(overview.quota.limit)}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">已同步定价</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {pricedModels.length}
            </div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              来自平台价格源
            </div>
          </div>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4 text-sm font-medium text-[var(--ink)]">
          定价策略
        </div>
        <div className="grid gap-4 p-5 text-sm leading-7 text-[var(--muted)] lg:grid-cols-3">
          <div className="rounded-lg border border-[var(--line)] bg-white/60 p-4">
            文本类模型按 tokens 估算：输入单价按价格源倍率计算，输出单价按输出倍率放大。
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white/60 p-4">
            图片、视频等固定计费模型按固定价格和单位记录；视频异步闭环先不展开。
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white/60 p-4">
            当前是预估账单，充值入口会先创建订单；支付通道接入后再更新余额。
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4 text-sm font-medium text-[var(--ink)]">
          最近计费明细
        </div>
        {recentBillableLogs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[color:rgba(16,16,16,0.03)] text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 font-medium">时间</th>
                  <th className="px-5 py-4 font-medium">模型</th>
                  <th className="px-5 py-4 font-medium">输入/输出</th>
                  <th className="px-5 py-4 font-medium">金额</th>
                  <th className="px-5 py-4 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {recentBillableLogs.map((log) => (
                  <tr key={log.id} className="border-t border-[var(--line)]">
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {log.createdAt.replace("T", " ").slice(0, 16)}
                    </td>
                    <td className="px-5 py-4 text-[var(--ink)]">{log.model ?? "--"}</td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {log.inputTokens ?? 0} / {log.outputTokens ?? 0}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {formatMoney(log.billableAmount, 6)}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">{log.statusCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-sm text-[var(--muted)]">
            暂无带计费字段的调用记录。执行最新 schema 后，新调用会开始写入。
          </div>
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4 text-sm font-medium text-[var(--ink)]">
          模型价格表
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[color:rgba(16,16,16,0.03)] text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4 font-medium">模型</th>
                <th className="px-5 py-4 font-medium">厂商</th>
                <th className="px-5 py-4 font-medium">分类</th>
                <th className="px-5 py-4 font-medium">价格</th>
              </tr>
            </thead>
            <tbody>
              {pricedModels.slice(0, 120).map((model) => (
                <tr key={`${model.sectionId}-${model.id}`} className="border-t border-[var(--line)]">
                  <td className="break-all px-5 py-4 font-medium text-[var(--ink)]">
                    {model.id}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">{model.provider}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{model.sectionTitle}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{formatPrice(model)}</td>
                </tr>
              ))}
              {!pricedModels.length ? (
                <tr>
                  <td className="px-5 py-6 text-[var(--muted)]" colSpan={4}>
                    暂未同步到模型价格。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
