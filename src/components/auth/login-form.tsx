"use client";

import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Code2, Mail } from "lucide-react";

import { appRoutes } from "@/lib/app-routes";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthMode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const missingSupabaseConfig = !supabase;

  const nextPath = searchParams.get("next")?.startsWith("/")
    ? searchParams.get("next")!
    : appRoutes.workspace;

  async function handleOAuthSignIn(provider: "google" | "github") {
    if (!supabase || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const redirectTo = `${window.location.origin}${appRoutes.authCallback}?next=${encodeURIComponent(
      nextPath,
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        startTransition(() => {
          router.push(nextPath);
          router.refresh();
        });

        return;
      }

      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const registerResult = (await registerResponse.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!registerResponse.ok) {
        setErrorMessage(registerResult?.error ?? "注册失败，请稍后再试。");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      startTransition(() => {
        router.push(nextPath);
        router.refresh();
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="panel w-full max-w-[460px] p-6 sm:p-8">
      <div className="flex gap-2 rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.52)] p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm ${
            mode === "signin" ? "bg-[var(--ink)] text-white" : "text-[var(--muted)]"
          }`}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm ${
            mode === "signup" ? "bg-[var(--ink)] text-white" : "text-[var(--muted)]"
          }`}
        >
          注册
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleOAuthSignIn("google")}
            disabled={isSubmitting || missingSupabaseConfig}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            Google
          </button>
          <button
            type="button"
            onClick={() => void handleOAuthSignIn("github")}
            disabled={isSubmitting || missingSupabaseConfig}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Code2 className="h-4 w-4" />
            GitHub
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            邮箱密码
          </span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <label className="block space-y-2">
          <div className="text-sm text-[var(--muted)]">邮箱</div>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
          />
        </label>

        <label className="block space-y-2">
          <div className="text-sm text-[var(--muted)]">密码</div>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
          />
        </label>

        {missingSupabaseConfig ? (
          <div className="rounded-lg bg-[color:rgba(178,68,37,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
            Supabase 配置未完成。
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg bg-[color:rgba(178,68,37,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || missingSupabaseConfig}
          className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "处理中..." : mode === "signin" ? "登录" : "注册"}
        </button>
      </form>
    </div>
  );
}
