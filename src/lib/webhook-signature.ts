import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Verifies "Standard Webhooks" signatures, used by Supabase Auth Hooks.
// Headers: webhook-id, webhook-timestamp, webhook-signature ("v1,<base64> v1,<base64>").
// Secret from the Supabase dashboard: "v1,whsec_<base64>".

const TOLERANCE_SECONDS = 5 * 60;

export function verifyStandardWebhook(body: string, headers: Headers, secret: string): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  return signatureHeader.split(" ").some((entry) => {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
