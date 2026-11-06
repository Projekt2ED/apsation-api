import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { requireCurrentUser } from "@/lib/auth";
import { playgroundModes } from "@/lib/playground-config";
import { getWorkspaceTasks } from "@/lib/workspace-data";

const modeLabelMap = new Map<string, string>(
  playgroundModes.map((mode) => [mode.id, mode.label]),
);

function formatDateLabel(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default async function WorkspaceTasksPage() {
  const user = await requireCurrentUser();
  const tasks = await getWorkspaceTasks(user.id);

  return (
    <div className="space-y-6">
      <div className="panel p-8">
        <WorkspacePageHeader title="异步任务" />
      </div>

      {tasks.length ? (
        <section className="grid gap-4">
          {tasks.map((task) => (
            <article key={task.id} className="panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-[var(--muted)]">
                    {task.upstreamTaskId}
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">
                    {task.model ?? modeLabelMap.get(task.modeId) ?? task.modeId}
                  </h2>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
                  {task.status}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[var(--line)] p-4 text-sm leading-7 text-[var(--muted)]">
                  更新时间：{formatDateLabel(task.updatedAt)}
                </div>
                <div className="rounded-lg border border-[var(--line)] p-4 text-sm leading-7 text-[var(--muted)]">
                  摘要：{task.note ?? "--"}
                </div>
                <div className="rounded-lg border border-[var(--line)] p-4 text-sm leading-7 text-[var(--muted)]">
                  结果：
                  {task.resultUrl ? (
                    <a
                      href={task.resultUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-[var(--ink)] underline underline-offset-4"
                    >
                      查看
                    </a>
                  ) : (
                    <span className="ml-2">--</span>
                  )}
                </div>
              </div>
              {task.promptPreview ? (
                <div className="mt-3 rounded-lg border border-[var(--line)] p-4 text-sm leading-7 text-[var(--muted)]">
                  {task.promptPreview}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className="panel p-8 text-sm text-[var(--muted)]">暂无任务</section>
      )}
    </div>
  );
}
