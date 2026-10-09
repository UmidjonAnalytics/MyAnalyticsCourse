import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import type { SiteSettings } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

// Contacts / legal details (one row, editable in admin) and the public site address.

const EMPTY: SiteSettings = {
  id: 1,
  company_name: "",
  stir: "",
  address: "",
  phone: "",
  email: "",
  telegram_url: "",
  instagram_url: "",
  support_hours: "",
  referral_enabled: false,
  referral_friend_percent: 0,
  referral_reward_percent: 0,
  updated_at: new Date(0).toISOString(),
};

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  return data ?? EMPTY;
});

/** Public address of the student site: PUBLIC_SITE_URL, else the current host. */
export async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/** Fills {{kompaniya}}, {{stir}}, ... in legal texts. Missing values show as a visible [blank]. */
export function fillPlaceholders(md: string, s: SiteSettings, site: string): string {
  const blank = (label: string) => `**[${label}]**`;
  const values: Record<string, string> = {
    kompaniya: s.company_name || blank("kompaniya nomi"),
    stir: s.stir || blank("STIR"),
    manzil: s.address || blank("manzil"),
    telefon: s.phone || blank("telefon"),
    email: s.email || blank("e-mail"),
    sayt: site.replace(/^https?:\/\//, ""),
    brend: uz.brand.name,
  };
  return md.replace(/\{\{\s*([a-z]+)\s*\}\}/g, (m, key: string) => values[key] ?? m);
}
