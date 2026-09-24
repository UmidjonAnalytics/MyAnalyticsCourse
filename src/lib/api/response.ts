import { NextResponse } from "next/server";
import { authErrorMessage } from "@/lib/auth/errors";

// JSON shape used by our API routes: { ok: true, ... } or { error: { code, message } }.
export type ApiError = { error: { code: string; message: string } };

export function apiError(status: number, code: string, message?: string) {
  return NextResponse.json<ApiError>({ error: { code, message: message ?? authErrorMessage(code) } }, { status });
}

export function apiOk<T extends Record<string, unknown>>(data: T = {} as T) {
  return NextResponse.json({ ok: true as const, ...data });
}
