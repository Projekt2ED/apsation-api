import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { requireCurrentUser } from "@/lib/auth";
import { getWorkspaceOverview } from "@/lib/workspace-data";

function formatDateLabel(value: string | null) {
  if (!value) {
    return "--";
  }

  return value.replace("T", " ").slice(0, 16);
}

function formatMoney(value: number) {
  return `¥${Number(value.toFixed(4))}`;
}

export default async function WorkspaceOverviewPage() {
  const user = await requireCurrentUser();
  const overview = await getWorkspaceOverview(user.id);

  return (
    <div className="space-y-6">
      <div className="panel p-8">
        <WorkspacePageHeader title="工作台" />

        <div className="mt-8 grid gap-4 xl:grid-cols-5">
          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">Key</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {overview.keyCount}
            </div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              Supabase {overview.supabaseReady ? "已连接" : "未配置"}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">日志</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {overview.logCount}
            </div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              最新 {formatDateLabel(overview.latestLogAt)}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">任务</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {overview.taskCount}
            </div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              最新 {formatDateLabel(overview.latestTaskAt)}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">本月余额</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {formatMoney(overview.quota.remaining)}
            </div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              已用 {formatMoney(overview.quota.used)} / {formatMoney(overview.quota.limit)}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.62)] p-5">
            <div className="text-sm font-medium text-[var(--ink)]">本月计费</div>
            <div className="mt-5 font-display text-4xl font-semibold text-[var(--ink)]">
              {formatMoney(overview.billing.monthAmount)}
            </div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              按平台价格预估
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
