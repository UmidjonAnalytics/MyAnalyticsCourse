import "server-only";
import { z } from "zod";
import { SmsError, type SmsProvider } from "./types";

// Eskiz.uz (https://documenter.getpostman.com/view/663428/RzfmES4z).
// Login with email + password gives a token (valid ~30 days). We cache it in memory and
// log in again when Eskiz answers 401.

const loginResponse = z.object({ data: z.object({ token: z.string().min(10) }) });

type Config = { apiUrl: string; email: string; password: string; from: string };

let cachedToken: { value: string; expiresAt: number } | null = null;

async function login(cfg: Config): Promise<string> {
  const body = new FormData();
  body.set("email", cfg.email);
  body.set("password", cfg.password);
  const res = await fetch(`${cfg.apiUrl}/auth/login`, { method: "POST", body, cache: "no-store" });
  if (!res.ok) throw new SmsError(`Eskiz login failed: HTTP ${res.status}`);
  const parsed = loginResponse.safeParse(await res.json());
  if (!parsed.success) throw new SmsError("Eskiz login: unexpected response");
  cachedToken = { value: parsed.data.data.token, expiresAt: Date.now() + 25 * 24 * 3600 * 1000 };
  return cachedToken.value;
}

async function token(cfg: Config, forceNew = false): Promise<string> {
  if (!forceNew && cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  return login(cfg);
}

export function createEskizProvider(cfg: Config): SmsProvider {
  return {
    name: "eskiz",
    async send(phone, text) {
      const attempt = async (forceNewToken: boolean) => {
        const body = new FormData();
        body.set("mobile_phone", phone);
        body.set("message", text);
        body.set("from", cfg.from);
        return fetch(`${cfg.apiUrl}/message/sms/send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${await token(cfg, forceNewToken)}` },
          body,
          cache: "no-store",
        });
      };

      let res = await attempt(false);
      if (res.status === 401) res = await attempt(true);
      if (!res.ok) {
        // Do not log the message text: it contains the code.
        const detail = await res.text().catch(() => "");
        throw new SmsError(`Eskiz send failed: HTTP ${res.status} ${detail.slice(0, 200)}`, res.status >= 500);
      }
    },
  };
}
