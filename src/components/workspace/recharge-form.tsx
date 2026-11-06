"use client";

import { useState } from "react";
import {
  BadgeCheck,
  CreditCard,
  Gift,
  LoaderCircle,
  Ticket,
  X,
} from "lucide-react";

const amountOptions = [10, 50, 100, 500] as const;

type PaymentProvider = "alipay" | "wechat";

const paymentProviders: Array<{
  id: PaymentProvider;
  label: string;
  icon: string;
}> = [
  {
    id: "alipay",
    label: "支付宝",
    icon: "/payment-icons/alipay.svg",
  },
  {
    id: "wechat",
    label: "微信支付",
    icon: "/payment-icons/wechat.svg",
  },
];

function formatAmount(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return amount.toFixed(amount % 1 === 0 ? 0 : 2);
}

export function RechargeDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="primary-button">
        <CreditCard className="h-4 w-4" />
        充值
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-white/70 bg-[var(--paper)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
                  <Gift className="h-4 w-4" />
                  账户充值
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">
                  充值余额
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-[var(--muted)] transition hover:text-[var(--ink)]"
                aria-label="关闭充值弹窗"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-5 sm:p-6">
              <RechargeForm compact />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function RechargeForm({ compact = false }: { compact?: boolean }) {
  const [amount, setAmount] = useState("50");
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("alipay");
  const [cardCode, setCardCode] = useState("");
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [isCardSubmitting, setIsCardSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPaymentSubmitting) {
      return;
    }

    setIsPaymentSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/billing/recharge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountCny: amount,
          provider: paymentProvider,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; checkoutUrl?: string | null; error?: { message?: string } }
        | null;

      if (!response.ok && response.status !== 202) {
        setError(payload?.error?.message ?? "创建充值订单失败。");
        return;
      }

      if (payload?.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
      }

      setMessage(payload?.message ?? "充值订单已创建，支付通道待接入。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "创建充值订单失败。");
    } finally {
      setIsPaymentSubmitting(false);
    }
  }

  async function handleCardSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCardSubmitting) {
      return;
    }

    setIsCardSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/billing/recharge/card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: cardCode,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            result?: { amountCny?: number; balanceCny?: number };
            error?: { message?: string };
          }
        | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "兑换卡密失败。");
        return;
      }

      setCardCode("");
      setMessage(
        `卡密兑换成功，已到账 ¥${formatAmount(String(payload?.result?.amountCny ?? 0))}。`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "兑换卡密失败。");
    } finally {
      setIsCardSubmitting(false);
    }
  }

  return (
    <div className={compact ? "space-y-4" : "panel space-y-5 p-6 sm:p-8"}>
      <section className="rounded-lg border border-[var(--line)] bg-white/65 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">卡密兑换</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              输入管理员发放的充值卡密，余额会立即到账。
            </p>
          </div>
        </div>

        <form onSubmit={handleCardSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={cardCode}
            onChange={(event) => setCardCode(event.target.value)}
            placeholder="APS-XXXX-XXXX-XXXX-XXXX"
            className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white px-4 py-3 font-mono text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={isCardSubmitting || !cardCode.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--ink)] px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCardSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            兑换
          </button>
        </form>
      </section>

      <form onSubmit={handlePaymentSubmit} className="rounded-lg border border-[var(--line)] bg-white/65 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:rgba(17,17,15,0.06)] text-[var(--ink)]">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">在线充值</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              选择金额和支付方式，支付通道接入后会自动跳转收银台。
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
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

        <label className="mt-4 block space-y-2">
          <div className="text-sm font-medium text-[var(--ink)]">自定义金额</div>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        <div className="mt-5">
          <div className="text-sm font-medium text-[var(--ink)]">支付方式</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {paymentProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => setPaymentProvider(provider.id)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                  paymentProvider === provider.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-white hover:border-[color:rgba(17,17,15,0.22)]"
                }`}
              >
                <span className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={provider.icon} alt="" className="h-7 w-7" />
                  <span className="text-sm font-medium text-[var(--ink)]">{provider.label}</span>
                </span>
                {paymentProvider === provider.id ? (
                  <BadgeCheck className="h-5 w-5 text-[var(--accent)]" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPaymentSubmitting}
          className="primary-button mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPaymentSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          ¥{formatAmount(amount)} 充值
        </button>
      </form>

      {message ? (
        <div className="rounded-lg bg-[color:rgba(16,104,74,0.1)] px-4 py-3 text-sm text-[var(--success)]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg bg-[color:rgba(178,68,37,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
