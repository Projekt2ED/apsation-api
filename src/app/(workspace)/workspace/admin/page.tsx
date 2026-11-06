import { notFound } from "next/navigation";

import { AdminRechargeCardIssuer } from "@/components/workspace/admin-recharge-card-issuer";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { isAdminUser } from "@/lib/admin-access";
import { getAdminDashboardData } from "@/lib/admin-data";
import { requireCurrentUser } from "@/lib/auth";
import { playgroundModes } from "@/lib/playground-config";

const modeLabelMap = new Map<string, string>(
  playgroundModes.map((mode) => [mode.id, mode.label]),
);

function formatDateLabel(value: string | null) {
  if (!value) {
    return "--";
  }

  return value.replace("T", " ").slice(0, 16);
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return `¥${Number(value.toFixed(4))}`;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return new Intl.NumberFormat("zh-CN").format(value);
}

function statusClassName(status: string) {
  if (status === "active" || status === "completed" || status === "succeeded") {
    return "bg-[color:rgba(16,104,74,0.1)] text-[var(--success)]";
  }

  if (status === "revoked" || status === "failed" || status === "error") {
    return "bg-[color:rgba(178,68,37,0.1)] text-[var(--danger)]";
  }

  return "bg-[var(--accent-soft)] text-[var(--accent)]";
}

export default async function WorkspaceAdminPage() {
  const user = await requireCurrentUser();

  if (!isAdminUser(user)) {
    notFound();
  }

  const data = await getAdminDashboardData();

  return (
    <div className="space-y-6">
      <div className="panel p-8">
        <WorkspacePageHeader
          title="管理后台"
          description="运营视角，查看用户、Key、调用日志、任务和计费消耗。"
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">用户</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {data.counts.users}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">Key</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {data.counts.keys}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">日志</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {data.counts.logs}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">任务</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {data.counts.tasks}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">本月计费</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {formatMoney(data.billing.monthAmount)}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">本月 Tokens</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {formatNumber(data.billing.inputTokens + data.billing.outputTokens)}
            </div>
          </div>
        </div>
      </div>

      <AdminRechargeCardIssuer />

      {!data.ready ? (
        <section className="panel p-8 text-sm text-[var(--muted)]">
          Supabase admin client 未配置。
        </section>
      ) : null}

      {data.ready && !data.billing.available ? (
        <section className="panel p-8 text-sm text-[var(--muted)]">
          计费字段尚未启用。执行最新 `supabase/schema.sql` 后，会显示金额、tokens 和排行。
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4 text-sm font-medium text-[var(--ink)]">
            用户消费排行
          </div>
          <div className="divide-y divide-[var(--line)]">
            {data.topUsers.map((item, index) => (
              <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-medium text-[var(--accent)]">
                      {index + 1}
                    </span>
                    <span className="truncate font-medium text-[var(--ink)]">{item.label}</span>
                  </div>
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    {item.count} 次调用
                  </div>
                </div>
                <div className="font-mono text-sm text-[var(--ink)]">
                  {formatMoney(item.amount)}
                </div>
              </div>
            ))}
            {!data.topUsers.length ? (
              <div className="px-5 py-6 text-sm text-[var(--muted)]">暂无计费数据</div>
            ) : null}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4 text-sm font-medium text-[var(--ink)]">
            模型消费排行
          </div>
          <div className="divide-y divide-[var(--line)]">
            {data.topModels.map((item, index) => (
              <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:rgba(17,17,15,0.06)] text-xs font-medium text-[var(--ink)]">
                      {index + 1}
                    </span>
                    <span className="truncate font-medium text-[var(--ink)]">{item.label}</span>
                  </div>
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    {item.count} 次调用
                  </div>
                </div>
                <div className="font-mono text-sm text-[var(--ink)]">
                  {formatMoney(item.amount)}
                </div>
              </div>
            ))}
            {!data.topModels.length ? (
              <div className="px-5 py-6 text-sm text-[var(--muted)]">暂无计费数据</div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4 text-sm font-medium text-[var(--ink)]">
          最近 Key
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-[color:rgba(16,16,16,0.03)] text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4 font-medium">用户</th>
                <th className="px-5 py-4 font-medium">名称</th>
                <th className="px-5 py-4 font-medium">Token</th>
                <th className="px-5 py-4 font-medium">状态</th>
                <th className="px-5 py-4 font-medium">最后使用</th>
                <th className="px-5 py-4 font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {data.keys.map((item) => (
                <tr key={item.id} className="border-t border-[var(--line)]">
                  <td className="px-5 py-4 text-[var(--muted)]">{item.userLabel}</td>
                  <td className="px-5 py-4 font-medium text-[var(--ink)]">{item.name}</td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--muted)]">
                    {item.tokenPreview}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClassName(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatDateLabel(item.lastUsedAt)}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatDateLabel(item.createdAt)}
                  </td>
                </tr>
              ))}
              {!data.keys.length ? (
                <tr>
                  <td className="px-5 py-6 text-[var(--muted)]" colSpan={6}>
                    暂无 Key
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4 text-sm font-medium text-[var(--ink)]">
          最近日志
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[color:rgba(16,16,16,0.03)] text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4 font-medium">时间</th>
                <th className="px-5 py-4 font-medium">用户</th>
                <th className="px-5 py-4 font-medium">模式</th>
                <th className="px-5 py-4 font-medium">模型</th>
                <th className="px-5 py-4 font-medium">状态</th>
                <th className="px-5 py-4 font-medium">耗时</th>
                <th className="px-5 py-4 font-medium">Tokens</th>
                <th className="px-5 py-4 font-medium">金额</th>
                <th className="px-5 py-4 font-medium">摘要</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((item) => (
                <tr key={item.id} className="border-t border-[var(--line)]">
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatDateLabel(item.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">{item.userLabel}</td>
                  <td className="px-5 py-4 text-[var(--ink)]">
                    {modeLabelMap.get(item.modeId) ?? item.modeId}
                  </td>
                  <td className="px-5 py-4 text-[var(--ink)]">{item.model ?? "--"}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{item.statusCode}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {item.durationMs ? `${item.durationMs} ms` : "--"}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {item.inputTokens !== null || item.outputTokens !== null
                      ? `${formatNumber(item.inputTokens ?? 0)} / ${formatNumber(item.outputTokens ?? 0)}`
                      : "--"}
                  </td>
                  <td className="px-5 py-4 font-mono text-[var(--muted)]">
                    {formatMoney(item.billableAmount)}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">{item.summary ?? "--"}</td>
                </tr>
              ))}
              {!data.logs.length ? (
                <tr>
                  <td className="px-5 py-6 text-[var(--muted)]" colSpan={9}>
                    暂无日志
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4 text-sm font-medium text-[var(--ink)]">
            最近用户
          </div>
          <div className="divide-y divide-[var(--line)]">
            {data.users.slice(0, 20).map((item) => (
              <div key={item.id} className="px-5 py-4">
                <div className="font-medium text-[var(--ink)]">{item.email ?? item.id}</div>
                <div className="mt-2 text-xs text-[var(--muted)]">
                  创建 {formatDateLabel(item.createdAt)} · 登录{" "}
                  {formatDateLabel(item.lastSignInAt)}
                </div>
              </div>
            ))}
            {!data.users.length ? (
              <div className="px-5 py-6 text-sm text-[var(--muted)]">暂无用户</div>
            ) : null}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4 text-sm font-medium text-[var(--ink)]">
            最近任务
          </div>
          <div className="divide-y divide-[var(--line)]">
            {data.tasks.slice(0, 20).map((item) => (
              <div key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-[var(--ink)]">
                      {item.model ?? modeLabelMap.get(item.modeId) ?? item.modeId}
                    </div>
                    <div className="mt-2 font-mono text-xs text-[var(--muted)]">
                      {item.upstreamTaskId}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClassName(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <div className="mt-3 text-xs text-[var(--muted)]">
                  {item.userLabel} · {formatDateLabel(item.updatedAt)}
                </div>
              </div>
            ))}
            {!data.tasks.length ? (
              <div className="px-5 py-6 text-sm text-[var(--muted)]">暂无任务</div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
