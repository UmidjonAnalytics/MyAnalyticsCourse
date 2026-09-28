"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminContext, audit, dbErrorMessage, forbidden, type ActionResult } from "@/lib/admin/context";
import { uz } from "@/lib/i18n/uz";

const e = uz.admin.errors;
const refresh = () => revalidatePath("/", "layout");

// Manual access, e.g. "Oldindan to'lagan". product = "course:<id>" or "bundle:<id>".
const grantSchema = z.object({
  userId: z.uuid(),
  product: z.string().regex(/^(course|bundle):[0-9a-f-]{36}$/),
  note: z.string().trim().max(300).default(""),
});

export async function grantAccess(input: z.input<typeof grantSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const { userId, product, note } = parsed.data;
  const [type, productId] = product.split(":") as ["course" | "bundle", string];

  let courseIds = [productId];
  if (type === "bundle") {
    const { data } = await ctx.supabase.from("bundle_courses").select("course_id").eq("bundle_id", productId);
    courseIds = (data ?? []).map((r) => r.course_id);
  }

  // Skip courses the student can already open.
  const { data: active } = await ctx.supabase
    .from("enrollments")
    .select("course_id, expires_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .in("course_id", courseIds);
  const has = new Set(
    (active ?? []).filter((a) => !a.expires_at || new Date(a.expires_at) > new Date()).map((a) => a.course_id),
  );
  const toAdd = courseIds.filter((id) => !has.has(id));

  if (toAdd.length > 0) {
    const { error } = await ctx.supabase.from("enrollments").insert(
      toAdd.map((courseId) => ({
        user_id: userId,
        course_id: courseId,
        source: "manual" as const,
        note: note || null,
        granted_by: ctx.userId,
      })),
    );
    if (error) return { ok: false, error: dbErrorMessage(error) };
  }
  await audit(ctx.supabase, ctx.userId, "grant_access", "profile", userId, { product, note, added: toAdd });
  refresh();
  return { ok: true, message: uz.admin.students.granted };
}

export async function revokeAccess(enrollmentId: string, userId: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(enrollmentId).success) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase
    .from("enrollments")
    .update({ revoked_at: new Date().toISOString(), revoked_by: ctx.userId, revoke_reason: "manual" })
    .eq("id", enrollmentId);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "revoke_access", "profile", userId, { enrollment: enrollmentId });
  refresh();
  return { ok: true };
}

export async function resetDevices(userId: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(userId).success) return { ok: false, error: e.invalid };
  // The database function also writes the audit log.
  const { data, error } = await ctx.supabase.rpc("admin_reset_devices", { p_user_id: userId });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  refresh();
  return { ok: true, message: uz.admin.students.devicesReset(data ?? 0) };
}

export async function setRole(userId: string, role: "student" | "admin"): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(userId).success || !["student", "admin"].includes(role)) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase.rpc("admin_set_role", { p_user_id: userId, p_role: role });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  refresh();
  return { ok: true };
}
