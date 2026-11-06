import "server-only";

import { NextResponse } from "next/server";

type ApiErrorResponseInput = {
  code: string;
  message: string;
  status: number;
  details?: unknown;
  meta?: Record<string, unknown>;
  headers?: HeadersInit;
};

export function buildApiErrorPayload({
  code,
  message,
  status,
  details,
  meta,
}: Omit<ApiErrorResponseInput, "headers">) {
  return {
    error: {
      code,
      message,
      status,
      ...(details === undefined ? {} : { details }),
    },
    ...(meta ?? {}),
  };
}

export function apiErrorResponse(input: ApiErrorResponseInput) {
  return NextResponse.json(buildApiErrorPayload(input), {
    status: input.status,
    headers: input.headers,
  });
}
