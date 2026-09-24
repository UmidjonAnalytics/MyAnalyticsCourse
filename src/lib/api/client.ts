import { uz } from "@/lib/i18n/uz";

// Browser helper for our JSON API routes. Never throws; network problems become an Uzbek message.
export type ApiResult<T> = ({ ok: true } & T) | { ok: false; code: string; message: string };

export async function postJson<T extends Record<string, unknown> = Record<string, never>>(
  url: string,
  body: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    if (res.ok && json && typeof json === "object" && "ok" in json) return json as { ok: true } & T;
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
    return { ok: false, code: err?.code ?? "generic", message: err?.message ?? uz.errors.generic };
  } catch {
    return { ok: false, code: "network", message: uz.errors.network };
  }
}
