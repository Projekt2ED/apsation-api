"use client";

import { useState } from "react";
import { Copy, Gift, LoaderCircle, Ticket } from "lucide-react";

const amountOptions = [10, 50, 100, 500] as const;

type IssuedCard = {
  code: string;
  codePreview: string;
  amountCny: number;
  expiresAt: string | null;
};

function formatAmount(value: string | number) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return amount.toFixed(amount % 1 === 0 ? 0 : 2);
}

export function AdminRechargeCardIssuer() {
  const [amount, setAmount] = useState("50");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [issuedCard, setIssuedCard] = useState<IssuedCard | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setIssuedCard(null);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/recharge-cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountCny: amount,
          note,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            card?: IssuedCard;
            error?: { message?: string };
          }
        | null;

      if (!response.ok || !payload?.card?.code) {
        setError(payload?.error?.message ?? "生成卡密失败。");
        return;
      }

      setIssuedCard(payload.card);
      setMessage("卡密已生成，明文只展示这一次。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成卡密失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyCode() {
    if (!issuedCard?.code) {
      return;
    }

    await navigator.clipboard.writeText(issuedCard.code);
    setMessage("卡密已复制。");
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
            <Gift className="h-4 w-4" />
            充值卡密
          </div>
          <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">发放充值卡</h2>
        </div>
        <div className="rounded-full bg-[color:rgba(17,17,15,0.06)] px-3 py-1 text-xs text-[var(--muted)]">
          明文仅返回一次
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {amountOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAmount(String(option))}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                  amount === String(option)
                    ? "border-transparent bg-[var(--ink)] text-white"
                    : "border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                ¥{option}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <div className="text-sm font-medium text-[var(--ink)]">金额</div>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            <label className="space-y-2">
              <div className="text-sm font-medium text-[var(--ink)]">过期时间</div>
              <input
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                type="datetime-local"
                className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <div className="text-sm font-medium text-[var(--ink)]">备注</div>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="例如：测试用户补偿、活动赠送"
              className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
            生成 ¥{formatAmount(amount)} 卡密
          </button>
        </form>

        <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
          <div className="text-sm font-medium text-[var(--ink)]">最新卡密</div>
          {issuedCard ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-[color:rgba(17,17,15,0.04)] p-3 font-mono text-sm leading-6 text-[var(--ink)]">
                {issuedCard.code}
              </div>
              <div className="text-xs leading-6 text-[var(--muted)]">
                金额 ¥{formatAmount(issuedCard.amountCny)}，预览 {issuedCard.codePreview}
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:border-[color:rgba(17,17,15,0.22)]"
              >
                <Copy className="h-4 w-4" />
                复制卡密
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-[color:rgba(17,17,15,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
              生成后会在这里显示完整卡密。离开页面后只能看到脱敏预览，无法再取回明文。
            </div>
          )}

          {message ? (
            <div className="mt-4 rounded-lg bg-[color:rgba(16,104,74,0.1)] px-4 py-3 text-sm text-[var(--success)]">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg bg-[color:rgba(178,68,37,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
