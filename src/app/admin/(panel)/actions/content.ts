"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminContext, audit, dbErrorMessage, forbidden, type ActionResult, type FormState } from "@/lib/admin/context";
import { uz } from "@/lib/i18n/uz";
import { SLUG_PATTERN } from "@/lib/slug";
import { youtubeId } from "@/lib/youtube";

// Server Actions for courses, categories, modules, lessons, bundles and the archive.

const refresh = () => revalidatePath("/", "layout");

const e = uz.admin.errors;
const title = z.string().trim().min(1, e.titleRequired).max(200);
const slug = z.string().trim().regex(SLUG_PATTERN, e.slugInvalid).max(100);
const price = z
  .string()
  .transform((v) => v.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{1,10}$/, e.priceInvalid))
  .transform(Number);
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.null(), z.undefined()])
  .transform((v) => v === "on" || v === "true");
const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .transform((v) => v || null)
  .pipe(z.url().nullable());
const md = z.string().max(100_000).default("");

function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? e.invalid;
}

const fd = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
};

// ------------------------------------------------------------------ courses

const courseSchema = z.object({
  id: z.uuid().optional(),
  title,
  slug,
  category_id: z
    .string()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  short_description: z.string().trim().max(300).default(""),
  description: md,
  cover_url: optionalUrl,
  price,
  is_published: checkbox,
});

export async function saveCourse(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { status: "error", error: e.forbidden };
  const parsed = courseSchema.safeParse({
    id: fd(form, "id") || undefined,
    title: fd(form, "title"),
    slug: fd(form, "slug"),
    category_id: fd(form, "category_id") ?? "",
    short_description: fd(form, "short_description"),
    description: fd(form, "description"),
    cover_url: fd(form, "cover_url") ?? "",
    price: fd(form, "price") ?? "",
    is_published: form.get("is_published"),
  });
  if (!parsed.success) return { status: "error", error: firstError(parsed.error) };
  const { id, ...values } = parsed.data;

  if (id) {
    const { error } = await ctx.supabase.from("courses").update(values).eq("id", id);
    if (error) return { status: "error", error: dbErrorMessage(error) };
    await audit(ctx.supabase, ctx.userId, "update", "course", id, { title: values.title, price: values.price });
    refresh();
    return { status: "saved" };
  }

  const { count } = await ctx.supabase.from("courses").select("id", { count: "exact", head: true });
  const { data, error } = await ctx.supabase
    .from("courses")
    .insert({ ...values, position: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { status: "error", error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "create", "course", data.id, { title: values.title });
  refresh();
  redirect(`/kurslar/${data.id}`);
}

// ------------------------------------------------------------------ publish / archive / reorder

const entityTable = {
  course: "courses",
  module: "modules",
  lesson: "lessons",
  bundle: "bundles",
} as const;
type Entity = keyof typeof entityTable;
const entitySchema = z.enum(["course", "module", "lesson", "bundle"]);

export async function setPublished(entity: Entity, id: string, value: boolean): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!entitySchema.safeParse(entity).success || !z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase.from(entityTable[entity]).update({ is_published: value }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, value ? "publish" : "unpublish", entity, id);
  refresh();
  return { ok: true };
}

export async function archiveItem(entity: Entity, id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!entitySchema.safeParse(entity).success || !z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase.from(entityTable[entity]).update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "archive", entity, id);
  refresh();
  return { ok: true };
}

export async function restoreItem(entity: Entity, id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!entitySchema.safeParse(entity).success || !z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase.from(entityTable[entity]).update({ archived_at: null }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "restore", entity, id);
  refresh();
  return { ok: true };
}

export async function purgeItem(entity: Entity, id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!entitySchema.safeParse(entity).success || !z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  // The database function checks: archived first, never paid content, writes the audit log.
  const { error } = await ctx.supabase.rpc("admin_purge", { p_entity: entity, p_id: id });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  refresh();
  return { ok: true };
}

export async function reorder(
  table: "categories" | "courses" | "modules" | "lessons" | "bundles",
  ids: string[],
): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = z.array(z.uuid()).max(500).safeParse(ids);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase.rpc("admin_reorder", { p_table: table, p_ids: parsed.data });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ categories

export async function saveCategory(id: string | null, name: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = z.string().trim().min(1).max(80).safeParse(name);
  if (!parsed.success) return { ok: false, error: e.titleRequired };
  const { slugify } = await import("@/lib/slug");
  const values = { name: parsed.data, slug: slugify(parsed.data) || `yonalish-${Date.now()}` };
  if (id) {
    const { error } = await ctx.supabase.from("categories").update(values).eq("id", id);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    await audit(ctx.supabase, ctx.userId, "update", "category", id, values);
  } else {
    const { count } = await ctx.supabase.from("categories").select("id", { count: "exact", head: true });
    const { data, error } = await ctx.supabase
      .from("categories")
      .insert({ ...values, position: (count ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { ok: false, error: dbErrorMessage(error) };
    await audit(ctx.supabase, ctx.userId, "create", "category", data.id, values);
  }
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const { count } = await ctx.supabase.from("courses").select("id", { count: "exact", head: true }).eq("category_id", id);
  if ((count ?? 0) > 0) return { ok: false, error: e.categoryInUse };
  const { error } = await ctx.supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "delete", "category", id);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ modules

export async function saveModule(courseId: string, moduleId: string | null, name: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = title.safeParse(name);
  if (!parsed.success || !z.uuid().safeParse(courseId).success) return { ok: false, error: e.titleRequired };
  if (moduleId) {
    const { error } = await ctx.supabase.from("modules").update({ title: parsed.data }).eq("id", moduleId);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    await audit(ctx.supabase, ctx.userId, "update", "module", moduleId, { title: parsed.data });
  } else {
    const { count } = await ctx.supabase.from("modules").select("id", { count: "exact", head: true }).eq("course_id", courseId);
    const { data, error } = await ctx.supabase
      .from("modules")
      .insert({ course_id: courseId, title: parsed.data, position: (count ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { ok: false, error: dbErrorMessage(error) };
    await audit(ctx.supabase, ctx.userId, "create", "module", data.id, { title: parsed.data });
  }
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ lessons

export async function createLesson(moduleId: string, name: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = title.safeParse(name);
  if (!parsed.success || !z.uuid().safeParse(moduleId).success) return { ok: false, error: e.titleRequired };
  const { slugify } = await import("@/lib/slug");
  const { data: mod } = await ctx.supabase.from("modules").select("course_id").eq("id", moduleId).single();
  if (!mod) return { ok: false, error: e.invalid };

  // Unique slug within the course: add -2, -3... if needed.
  const base = slugify(parsed.data) || "dars";
  const { data: taken } = await ctx.supabase.from("lessons").select("slug").eq("course_id", mod.course_id).like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((t) => t.slug));
  let lessonSlug = base;
  for (let n = 2; used.has(lessonSlug); n += 1) lessonSlug = `${base}-${n}`;

  const { count } = await ctx.supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
  const { data, error } = await ctx.supabase
    .from("lessons")
    .insert({
      module_id: moduleId,
      course_id: mod.course_id,
      title: parsed.data,
      slug: lessonSlug,
      position: (count ?? 0) + 1,
      is_published: false,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await ctx.supabase.from("lesson_contents").insert({ lesson_id: data.id });
  await audit(ctx.supabase, ctx.userId, "create", "lesson", data.id, { title: parsed.data });
  refresh();
  return { ok: true, id: data.id };
}

const lessonSchema = z.object({
  id: z.uuid(),
  title,
  slug,
  module_id: z.uuid(),
  youtube_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || youtubeId(v) !== null, e.youtubeInvalid),
  content_md: md,
  task_md: md,
  duration_minutes: z.preprocess(
    (v) => (v === null || v === "" ? null : Number(v)),
    z.number().int().min(0).max(600).nullable(),
  ),
  is_free_preview: checkbox,
  is_published: checkbox,
});

export async function saveLesson(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { status: "error", error: e.forbidden };
  const parsed = lessonSchema.safeParse({
    id: fd(form, "id"),
    title: fd(form, "title"),
    slug: fd(form, "slug"),
    module_id: fd(form, "module_id"),
    youtube_url: fd(form, "youtube_url") ?? "",
    content_md: fd(form, "content_md"),
    task_md: fd(form, "task_md"),
    duration_minutes: fd(form, "duration_minutes") ?? null,
    is_free_preview: form.get("is_free_preview"),
    is_published: form.get("is_published"),
  });
  if (!parsed.success) return { status: "error", error: firstError(parsed.error) };
  const { id, youtube_url, content_md, task_md, ...lesson } = parsed.data;

  const { error } = await ctx.supabase.from("lessons").update(lesson).eq("id", id);
  if (error) return { status: "error", error: dbErrorMessage(error) };
  const { error: contentError } = await ctx.supabase
    .from("lesson_contents")
    .upsert({ lesson_id: id, youtube_url: youtube_url || null, content_md, task_md }, { onConflict: "lesson_id" });
  if (contentError) return { status: "error", error: dbErrorMessage(contentError) };

  await audit(ctx.supabase, ctx.userId, "update", "lesson", id, { title: lesson.title });
  refresh();
  return { status: "saved" };
}

// ------------------------------------------------------------------ bundles

const bundleSchema = z.object({
  id: z.uuid().optional(),
  title,
  slug,
  short_description: z.string().trim().max(300).default(""),
  description: md,
  cover_url: optionalUrl,
  price,
  allow_upgrade_pricing: checkbox,
  is_published: checkbox,
  course_ids: z.array(z.uuid()).min(1, uz.admin.bundles.coursesHint),
});

export async function saveBundle(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { status: "error", error: e.forbidden };
  const parsed = bundleSchema.safeParse({
    id: fd(form, "id") || undefined,
    title: fd(form, "title"),
    slug: fd(form, "slug"),
    short_description: fd(form, "short_description"),
    description: fd(form, "description"),
    cover_url: fd(form, "cover_url") ?? "",
    price: fd(form, "price") ?? "",
    allow_upgrade_pricing: form.get("allow_upgrade_pricing"),
    is_published: form.get("is_published"),
    course_ids: form.getAll("course_ids").filter((v): v is string => typeof v === "string"),
  });
  if (!parsed.success) return { status: "error", error: firstError(parsed.error) };
  const { id, course_ids, ...values } = parsed.data;

  let bundleId = id;
  if (bundleId) {
    const { error } = await ctx.supabase.from("bundles").update(values).eq("id", bundleId);
    if (error) return { status: "error", error: dbErrorMessage(error) };
  } else {
    const { count } = await ctx.supabase.from("bundles").select("id", { count: "exact", head: true });
    const { data, error } = await ctx.supabase
      .from("bundles")
      .insert({ ...values, position: (count ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { status: "error", error: dbErrorMessage(error) };
    bundleId = data.id;
  }

  // Replace the course list.
  await ctx.supabase.from("bundle_courses").delete().eq("bundle_id", bundleId);
  const { error: linkError } = await ctx.supabase
    .from("bundle_courses")
    .insert(course_ids.map((courseId, i) => ({ bundle_id: bundleId, course_id: courseId, position: i + 1 })));
  if (linkError) return { status: "error", error: dbErrorMessage(linkError) };

  await audit(ctx.supabase, ctx.userId, id ? "update" : "create", "bundle", bundleId, {
    title: values.title,
    price: values.price,
    courses: course_ids,
  });
  refresh();
  if (!id) redirect(`/toplamlar/${bundleId}`);
  return { status: "saved" };
}
