"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { appRoutes, isRouteActive, primaryNavigation } from "@/lib/app-routes";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { siteName } from "@/lib/site-config";

function truncateEmail(email: string) {
  return email.length > 26 ? `${email.slice(0, 23)}...` : email;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    supabase.auth.getUser().then((result) => {
      if (active) {
        setUserEmail(result.data.user?.email ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      router.refresh();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    router.push(appRoutes.login);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40">
      <div className="site-shell py-3 sm:py-4">
        <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.72)] px-3 py-3 shadow-[0_18px_48px_rgba(17,17,15,0.05)] backdrop-blur-xl sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.18em] text-[var(--ink)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--panel-strong)] font-display text-lg tracking-normal">
                A
              </span>
              <span>{siteName}</span>
            </Link>

            <nav className="order-3 w-full md:order-2 md:flex-1">
              <div className="flex gap-2 overflow-x-auto pb-1 md:justify-center">
                {primaryNavigation.map((item) => {
                  const active = isRouteActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`shrink-0 rounded-lg px-4 py-2 text-sm ${
                        active
                          ? "bg-[var(--ink)] text-white"
                          : "border border-[var(--line)] bg-[color:rgba(255,255,255,0.54)] text-[var(--muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="ml-auto flex items-center gap-2 md:order-3">
              {userEmail ? (
                <>
                  <div className="hidden rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.54)] px-3 py-2 text-sm text-[var(--muted)] lg:block">
                    {truncateEmail(userEmail)}
                  </div>
                  <button type="button" onClick={handleSignOut} className="subtle-button">
                    <LogOut className="h-4 w-4" />
                    退出
                  </button>
                </>
              ) : (
                <Link href={appRoutes.login} className="subtle-button">
                  登录
                </Link>
              )}

              <Link href={appRoutes.workspace} className="primary-button">
                工作台
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
