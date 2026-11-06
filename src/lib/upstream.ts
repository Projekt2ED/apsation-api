import "server-only";

import { playgroundModes } from "@/lib/playground-config";

const knownUpstreamSuffixes = [
  ...new Set(["/v1/models", ...playgroundModes.map((mode) => mode.endpoint)]),
].sort((a, b) => b.length - a.length);

export function normalizeUpstreamBaseUrl(input: string) {
  const trimmed = input.trim().replace(/\/+$/, "");

  for (const suffix of knownUpstreamSuffixes) {
    if (trimmed.endsWith(suffix)) {
      return trimmed.slice(0, trimmed.length - suffix.length) || trimmed;
    }
  }

  return trimmed;
}

export function coerceText(value: unknown) {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

export function summarizeText(value: string | null, maxLength = 140) {
  if (!value) {
    return null;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

export function extractPromptPreview(modeId: string, payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.prompt === "string") {
    return summarizeText(record.prompt.trim());
  }

  if (typeof record.input === "string") {
    return summarizeText(record.input.trim());
  }

  if (modeId === "chat" && Array.isArray(record.messages)) {
    const userMessages = record.messages
      .filter((message) => {
        if (!message || typeof message !== "object") {
          return false;
        }

        return (message as Record<string, unknown>).role === "user";
      })
      .map((message) => {
        const content = (message as Record<string, unknown>).content;

        if (typeof content === "string") {
          return content;
        }

        if (Array.isArray(content)) {
          return content
            .map((item) => {
              if (!item || typeof item !== "object") {
                return "";
              }

              return String(
                (item as Record<string, unknown>).text ??
                  (item as Record<string, unknown>).content ??
                  "",
              );
            })
            .join("\n");
        }

        return "";
      })
      .filter(Boolean);

    return summarizeText(userMessages[userMessages.length - 1] ?? null);
  }

  return null;
}

export function extractModel(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return coerceText((payload as Record<string, unknown>).model);
}

export function extractResponseReferences(data: unknown) {
  if (!data || typeof data !== "object") {
    return {
      taskId: null,
      resultId: null,
      status: null,
      resultUrl: null,
      errorMessage: null,
      summary: null,
    };
  }

  const payload = data as Record<string, unknown>;
  const taskId = coerceText(payload.task_id);
  const resultId = coerceText(payload.id);
  const status = coerceText(payload.status);
  const errorMessage =
    coerceText(payload.error) ||
    (payload.error && typeof payload.error === "object"
      ? coerceText((payload.error as Record<string, unknown>).message)
      : null);

  const directUrl =
    coerceText(payload.url) ??
    coerceText(payload.video_url) ??
    coerceText(payload.videoUrl) ??
    coerceText(payload.output_url) ??
    coerceText(payload.outputUrl);

  const entries = Array.isArray(payload.data) ? payload.data : [];
  const firstEntry =
    entries.length && entries[0] && typeof entries[0] === "object"
      ? (entries[0] as Record<string, unknown>)
      : null;
  const entryUrl = firstEntry ? coerceText(firstEntry.url) : null;

  const usage =
    payload.usage && typeof payload.usage === "object"
      ? (payload.usage as Record<string, unknown>)
      : null;

  let summary =
    errorMessage ??
    (taskId ? `Task ID: ${taskId}` : null) ??
    (resultId ? `Result ID: ${resultId}` : null) ??
    (directUrl || entryUrl ? "Result returned" : null);

  if (!summary && usage) {
    const totalTokens = usage.total_tokens ?? usage.output_tokens ?? usage.input_tokens;

    if (typeof totalTokens === "number") {
      summary = `Tokens: ${totalTokens}`;
    }
  }

  return {
    taskId,
    resultId,
    status,
    resultUrl: directUrl ?? entryUrl,
    errorMessage,
    summary,
  };
}
