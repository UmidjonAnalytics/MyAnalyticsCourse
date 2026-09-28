import "server-only";
import { headers } from "next/headers";

/**
 * Address of the student site, for links from the admin panel.
 * PUBLIC_SITE_URL wins; otherwise "admin.example.uz" -> "example.uz". Null if unknown.
 */
export async function publicSiteUrl(): Promise<string | null> {
  const fromEnv = process.env.PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const h = await headers();
  const host = h.get("host") ?? "";
  if (!host.toLowerCase().startsWith("admin.")) return null;
  return `${h.get("x-forwarded-proto") ?? "https"}://${host.slice("admin.".length)}`;
}
