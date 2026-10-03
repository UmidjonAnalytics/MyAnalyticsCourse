"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminContext, audit, dbErrorMessage, forbidden, type ActionResult } from "@/lib/admin/context";
import { uz } from "@/lib/i18n/uz";

// Contacts / legal details and the legal page texts (admin only).

const text = (max: number) => z.string().trim().max(max);
const httpsOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v));

const settingsSchema = z.object({
  company_name: text(200),
  stir: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{9}$/.test(v)),
  address: text(300),
  phone: text(40),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)),
  telegram_url: httpsOrEmpty,
  instagram_url: httpsOrEmpty,
  support_hours: text(100),
});

export async function saveSiteSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: uz.admin.settings.invalid };
  const { error } = await ctx.supabase.from("site_settings").update(parsed.data).eq("id", 1);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "update", "site_settings", null, { company: parsed.data.company_name });
  revalidatePath("/", "layout");
  return { ok: true, message: uz.admin.settings.saved };
}

const pageSchema = z.object({
  slug: z.enum(["oferta", "maxfiylik", "qaytarish"]),
  title: z.string().trim().min(1).max(120),
  body_md: z.string().max(100_000),
});

export async function saveSitePage(input: z.input<typeof pageSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: uz.admin.errors.invalid };
  const { slug, ...values } = parsed.data;
  const { error } = await ctx.supabase.from("site_pages").update(values).eq("slug", slug);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "update", "site_page", null, { slug });
  revalidatePath(`/${slug}`);
  return { ok: true, message: uz.admin.settings.saved };
}
