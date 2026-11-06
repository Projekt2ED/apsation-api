"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { WorkspaceKeyRecord } from "@/lib/workspace-data";

type WorkspaceKeysManagerProps = {
  initialKeys: WorkspaceKeyRecord[];
};

type CreateKeyResponse = {
  key?: WorkspaceKeyRecord;
  secret?: string;
  error?: string;
};

function formatDateLabel(value: string | null) {
  if (!value) {
    return "--";
  }

  return value.replace("T", " ").slice(0, 16);
}

function getTypeLabel(kind: string) {
  if (kind === "issued") {
    return "平台 Key";
  }

  return "手动";
}

function getStatusClassName(status: string) {
  if (status === "revoked") {
    return "bg-[color:rgba(178,68,37,0.1)] text-[var(--danger)]";
  }

  return "bg-[var(--accent-soft)] text-[var(--accent)]";
}

function getStatusLabel(status: string) {
  if (status === "active") {
    return "可用";
  }

  if (status === "revoked") {
    return "已吊销";
  }

  if (status === "restricted") {
    return "受限";
  }

  return status;
}

export function WorkspaceKeysManager({
  initialKeys,
}: WorkspaceKeysManagerProps) {
  const router = useRouter();
  const [createdKeys, setCreatedKeys] = useState<WorkspaceKeyRecord[]>([]);
  const [revokedKeyIds, setRevokedKeyIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const displayedKeys = [...createdKeys, ...initialKeys]
    .filter((item) => item.kind !== "system")
    .filter(
      (item, index, collection) =>
        collection.findIndex((entry) => entry.id === item.id) === index,
    )
    .map((item) =>
      revokedKeyIds.includes(item.id)
        ? {
            ...item,
            status: "revoked",
          }
        : item,
    );

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/workspace/keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
      }),
    });

    const payload = (await response.json().catch(() => null)) as CreateKeyResponse | null;

    if (!response.ok || !payload?.key || !payload.secret) {
      setError(payload?.error ?? "创建 API Key 失败。");
      return;
    }

    setName("");
    setSecret(payload.secret);
    setCreatedKeys((current) => [payload.key!, ...current.filter((item) => item.id !== payload.key!.id)]);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleRevoke(keyId: string) {
    setError(null);
    setRevokeKeyId(keyId);

    try {
      const response = await fetch(`/api/workspace/keys/${keyId}/revoke`, {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "吊销 API Key 失败。");
        return;
      }

      setCreatedKeys((current) =>
        current.map((item) =>
          item.id === keyId
            ? {
                ...item,
                status: "revoked",
              }
            : item,
        ),
      );
      setRevokedKeyIds((current) =>
        current.includes(keyId) ? current : [...current, keyId],
      );

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setRevokeKeyId(null);
    }
  }

  async function handleCopySecret() {
    if (!secret) {
      return;
    }

    await navigator.clipboard.writeText(secret);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="panel p-6 sm:p-7">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-[var(--ink)]">创建 API Key</div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  用于外部 `/v1/*` 调用的平台 Key。
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="primary-button disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "创建中..." : "创建"}
              </button>
            </div>

            <label className="block space-y-2">
              <div className="text-sm text-[var(--muted)]">Key 名称</div>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={48}
                placeholder="Production"
                className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
              />
            </label>

            {error ? (
              <div className="rounded-lg bg-[color:rgba(178,68,37,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}

            {secret ? (
              <div className="rounded-lg border border-[var(--line)] bg-[color:rgba(255,255,255,0.7)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[var(--ink)]">新 Key</div>
                  <button type="button" onClick={handleCopySecret} className="subtle-button">
                    复制
                  </button>
                </div>
                <div className="mt-3 break-all rounded-lg bg-[var(--ink)] px-4 py-3 font-mono text-sm text-white">
                  {secret}
                </div>
                <div className="mt-3 text-sm text-[var(--muted)]">
                  完整 token 只展示一次。
                </div>
              </div>
            ) : null}
          </form>
        </div>

        <div className="panel p-6 sm:p-7">
          <div className="text-sm font-medium text-[var(--ink)]">Base URL</div>
          <div className="mt-3 rounded-lg bg-[color:rgba(255,255,255,0.76)] px-4 py-3 font-mono text-sm text-[var(--ink)]">
            /v1
          </div>
          <div className="mt-4 text-sm text-[var(--muted)]">
            Use `Authorization: Bearer aps_live_...`
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[color:rgba(16,16,16,0.03)] text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4 font-medium">名称</th>
                <th className="px-5 py-4 font-medium">类型</th>
                <th className="px-5 py-4 font-medium">Token</th>
                <th className="px-5 py-4 font-medium">权限</th>
                <th className="px-5 py-4 font-medium">本月调用</th>
                <th className="px-5 py-4 font-medium">状态</th>
                <th className="px-5 py-4 font-medium">最后使用</th>
                <th className="px-5 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {displayedKeys.map((item) => (
                <tr key={item.id} className="border-t border-[var(--line)]">
                  <td className="px-5 py-4 font-medium text-[var(--ink)]">{item.name}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{getTypeLabel(item.kind)}</td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--muted)]">
                    {item.tokenPreview}
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">{item.scope}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {item.monthlyUsageCount}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClassName(
                        item.status,
                      )}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatDateLabel(item.lastUsedAt)}
                  </td>
                  <td className="px-5 py-4">
                    {item.kind === "issued" && item.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => handleRevoke(item.id)}
                        disabled={revokeKeyId === item.id}
                        className="subtle-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {revokeKeyId === item.id ? "吊销中..." : "吊销"}
                      </button>
                    ) : (
                      <span className="text-[var(--muted)]">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
