"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminContext, audit, dbErrorMessage, forbidden, type ActionResult, type FormState } from "@/lib/admin/context";
import type { Json } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";

// Server Actions for orders (manual refund/revoke) and promo codes.

const refresh = () => revalidatePath("/", "layout");

export async function refundOrder(orderId: string, note: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: uz.admin.errors.invalid };
  // Database function: marks refunded (or cancels a pending order), revokes access, writes audit log.
  const { error } = await ctx.supabase.rpc("admin_refund_order", { p_order_id: orderId, p_note: note.slice(0, 300) });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  refresh();
  return { ok: true, message: uz.admin.orders.refunded };
}

const promoSchema = z
  .object({
    id: z.uuid().optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/, uz.admin.promo.codeHint),
    discount_type: z.enum(["percent", "fixed"]),
    discount_value: z.coerce.number().int().positive(uz.admin.promo.invalidValue),
    valid_from: z.string().optional(),
    valid_to: z.string().optional(),
    usage_limit: z.string().optional(),
    applies_all: z.boolean(),
    course_ids: z.array(z.uuid()),
    bundle_ids: z.array(z.uuid()),
    is_active: z.boolean(),
  })
  .refine((v) => v.discount_type !== "percent" || v.discount_value <= 100, { message: uz.admin.promo.invalidValue });

const date = (v: string | undefined, endOfDay = false) =>
  v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T${endOfDay ? "23:59:59" : "00:00:00"}+05:00` : null;

export async function savePromo(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { status: "error", error: uz.admin.errors.forbidden };
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const parsed = promoSchema.safeParse({
    id: str("id") || undefined,
    code: str("code") ?? "",
    discount_type: str("discount_type"),
    discount_value: str("discount_value"),
    valid_from: str("valid_from"),
    valid_to: str("valid_to"),
    usage_limit: str("usage_limit"),
    applies_all: str("applies") !== "some",
    course_ids: form.getAll("course_ids").filter((v): v is string => typeof v === "string"),
    bundle_ids: form.getAll("bundle_ids").filter((v): v is string => typeof v === "string"),
    is_active: form.get("is_active") === "on",
  });
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0]?.message ?? uz.admin.errors.invalid };
  const v = parsed.data;
  const limit = v.usage_limit && /^\d+$/.test(v.usage_limit) && Number(v.usage_limit) > 0 ? Number(v.usage_limit) : null;
  const values = {
    code: v.code,
    discount_type: v.discount_type,
    discount_value: v.discount_value,
    valid_from: date(v.valid_from),
    valid_to: date(v.valid_to, true),
    usage_limit: limit,
    applies_to: (v.applies_all ? { all: true } : { courses: v.course_ids, bundles: v.bundle_ids }) as Json,
    is_active: v.is_active,
  };

  if (v.id) {
    const { error } = await ctx.supabase.from("promo_codes").update(values).eq("id", v.id);
    if (error) return { status: "error", error: error.code === "23505" ? uz.admin.promo.codeTaken : dbErrorMessage(error) };
    await audit(ctx.supabase, ctx.userId, "update", "promo_code", v.id, { code: v.code });
    refresh();
    return { status: "saved" };
  }
  const { data, error } = await ctx.supabase.from("promo_codes").insert(values).select("id").single();
  if (error) return { status: "error", error: error.code === "23505" ? uz.admin.promo.codeTaken : dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "create", "promo_code", data.id, { code: v.code });
  refresh();
  redirect(`/promo/${data.id}`);
}

export async function archivePromo(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const { error } = await ctx.supabase.from("promo_codes").update({ archived_at: new Date().toISOString(), is_active: false }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "archive", "promo_code", id);
  refresh();
  return { ok: true };
}
