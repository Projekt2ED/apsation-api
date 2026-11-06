import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { requireCurrentUser } from "@/lib/auth";
import { playgroundModes } from "@/lib/playground-config";
import { getWorkspaceLogs } from "@/lib/workspace-data";

const modeLabelMap = new Map<string, string>(
  playgroundModes.map((mode) => [mode.id, mode.label]),
);

function formatDateLabel(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "--";
  }

  return `¥${Number(value.toFixed(6))}`;
}

export default async function WorkspaceLogsPage() {
  const user = await requireCurrentUser();
  const logs = await getWorkspaceLogs(user.id);

  return (
    <div className="space-y-6">
      <div className="panel p-8">
        <WorkspacePageHeader title="调用日志" />
      </div>

      <section className="panel overflow-hidden">
        {logs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-[color:rgba(16,16,16,0.03)] text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 font-medium">时间</th>
                  <th className="px-5 py-4 font-medium">模式</th>
                  <th className="px-5 py-4 font-medium">模型</th>
                  <th className="px-5 py-4 font-medium">状态</th>
                  <th className="px-5 py-4 font-medium">耗时</th>
                  <th className="px-5 py-4 font-medium">Tokens</th>
                  <th className="px-5 py-4 font-medium">计费</th>
                  <th className="px-5 py-4 font-medium">摘要</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-[var(--line)]">
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {formatDateLabel(log.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-[var(--ink)]">
                      {modeLabelMap.get(log.modeId) ?? log.modeId}
                    </td>
                    <td className="px-5 py-4 text-[var(--ink)]">{log.model ?? "--"}</td>
                    <td className="px-5 py-4 text-[var(--muted)]">{log.statusCode}</td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {log.durationMs ? `${log.durationMs} ms` : "--"}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {log.inputTokens !== null || log.outputTokens !== null
                        ? `${log.inputTokens ?? 0} / ${log.outputTokens ?? 0}`
                        : "--"}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {formatMoney(log.billableAmount)}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {log.errorMessage ?? log.summary ?? "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-sm text-[var(--muted)]">暂无日志</div>
        )}
      </section>
    </div>
  );
}
