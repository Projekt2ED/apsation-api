"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FolderKanban, Gauge, KeyRound, Orbit, ShieldCheck } from "lucide-react";

import { appRoutes, isRouteActive, workspaceNavigation } from "@/lib/app-routes";

const iconMap = {
  [appRoutes.workspace]: Gauge,
  [appRoutes.workspaceKeys]: KeyRound,
  [appRoutes.workspaceLogs]: Orbit,
  [appRoutes.workspaceBilling]: CreditCard,
  [appRoutes.workspaceTasks]: FolderKanban,
  [appRoutes.workspaceAdmin]: ShieldCheck,
} as const;

type WorkspaceNavProps = {
  showAdmin?: boolean;
};

export function WorkspaceNav({ showAdmin = false }: WorkspaceNavProps) {
  const pathname = usePathname();
  const items = showAdmin
    ? workspaceNavigation
    : workspaceNavigation.filter((item) => item.href !== appRoutes.workspaceAdmin);

  return (
    <nav className="grid gap-2">
      {items.map((item) => {
        const active = isRouteActive(pathname, item.href);
        const Icon = iconMap[item.href as keyof typeof iconMap];

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg border px-4 py-3 transition ${
              active
                ? "border-[var(--ink)] bg-[var(--ink)] text-white shadow-[0_18px_42px_rgba(17,17,15,0.14)]"
                : "border-transparent bg-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-[color:rgba(255,255,255,0.55)] hover:text-[var(--ink)]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                  active
                    ? "border-white/16 bg-white/10"
                    : "border-[var(--line)] bg-[color:rgba(255,255,255,0.82)]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-medium">{item.label}</div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
