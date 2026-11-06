import type { ReactNode } from "react";

import { WorkspaceNav } from "@/components/workspace/workspace-nav";
import { requireCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requireCurrentUser();
  const isAdmin = isAdminUser(user);

  return (
    <div className="flex-1">
      <div className="site-shell section-space grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <div className="panel p-5">
            <p className="eyebrow">工作台</p>
            <h2 className="mt-4 font-display text-3xl font-semibold text-[var(--ink)]">
              Apsation API
            </h2>
            <p className="mt-4 break-all text-sm text-[var(--muted)]">
              {user.email ?? user.id}
            </p>
          </div>

          <div className="panel p-4">
            <WorkspaceNav showAdmin={isAdmin} />
          </div>
        </aside>

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
