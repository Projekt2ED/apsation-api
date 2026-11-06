import Link from "next/link";

import { primaryNavigation } from "@/lib/app-routes";
import { contactPhone, siteName } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="pb-4">
      <div className="site-shell">
        <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.52)] px-5 py-6 text-sm text-[var(--muted)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-medium text-[var(--ink)]">{siteName}</span>
              {primaryNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition hover:text-[var(--ink)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span>联系 {contactPhone}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
