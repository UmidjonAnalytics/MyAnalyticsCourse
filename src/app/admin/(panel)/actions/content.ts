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

// Textarea with one item per line -> text[] (max 20 items, 300 chars each).
const lines = z
  .string()
  .default("")
  .transform((v) =>
    v
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((l) => l.slice(0, 300)),
  );

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
  level: z
    .string()
    .transform((v) => v || null)
    .pipe(z.enum(["beginner", "intermediate", "advanced"]).nullable()),
  instructor_id: z
    .string()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  outcomes: lines,
  audience: lines,
  requirements: lines,
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
    level: fd(form, "level") ?? "",
    instructor_id: fd(form, "instructor_id") ?? "",
    outcomes: fd(form, "outcomes") ?? "",
    audience: fd(form, "audience") ?? "",
    requirements: fd(form, "requirements") ?? "",
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

// ------------------------------------------------------------------ learning paths

const level = z
  .string()
  .default("")
  .transform((v) => v || null)
  .pipe(z.enum(["beginner", "intermediate", "advanced"]).nullable());

const pathSchema = z.object({
  id: z.uuid().optional(),
  title,
  slug,
  short_description: z.string().trim().max(300).default(""),
  description: md,
  cover_url: optionalUrl,
  level,
  outcomes: lines,
  bundle_id: z
    .string()
    .default("")
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  is_published: checkbox,
  course_ids: z
    .string()
    .default("")
    .transform((v) => v.split(",").filter(Boolean))
    .pipe(z.array(z.uuid()).max(30)),
});

export async function savePath(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { status: "error", error: e.forbidden };
  const parsed = pathSchema.safeParse({
    id: fd(form, "id") || undefined,
    title: fd(form, "title"),
    slug: fd(form, "slug"),
    short_description: fd(form, "short_description"),
    description: fd(form, "description"),
    cover_url: fd(form, "cover_url") ?? "",
    level: fd(form, "level"),
    outcomes: fd(form, "outcomes"),
    bundle_id: fd(form, "bundle_id"),
    is_published: form.get("is_published"),
    course_ids: fd(form, "course_ids"),
  });
  if (!parsed.success) return { status: "error", error: firstError(parsed.error) };
  const { id: existingId, course_ids, ...values } = parsed.data;
  if (values.is_published && course_ids.length === 0) return { status: "error", error: uz.admin.paths.noCourses };

  let id = existingId;
  if (id) {
    const { error } = await ctx.supabase.from("learning_paths").update(values).eq("id", id);
    if (error) return { status: "error", error: dbErrorMessage(error) };
  } else {
    const { count } = await ctx.supabase.from("learning_paths").select("id", { count: "exact", head: true });
    const { data, error } = await ctx.supabase
      .from("learning_paths")
      .insert({ ...values, position: (count ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { status: "error", error: dbErrorMessage(error) };
    id = data.id;
  }
  const { error: delErr } = await ctx.supabase.from("learning_path_courses").delete().eq("path_id", id);
  if (delErr) return { status: "error", error: dbErrorMessage(delErr) };
  if (course_ids.length > 0) {
    const { error: insErr } = await ctx.supabase
      .from("learning_path_courses")
      .insert([...new Set(course_ids)].map((course_id, i) => ({ path_id: id!, course_id, position: i + 1 })));
    if (insErr) return { status: "error", error: dbErrorMessage(insErr) };
  }
  await audit(ctx.supabase, ctx.userId, existingId ? "update" : "create", "path", id, { title: values.title, courses: course_ids.length });
  refresh();
  if (!existingId) redirect(`/yollar/${id}`);
  return { status: "saved" };
}

export async function deletePath(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const { error } = await ctx.supabase.from("learning_paths").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "delete", "path", id);
  refresh();
  redirect("/yollar");
}

// ------------------------------------------------------------------ portfolio projects

const projectSchema = z.object({
  id: z.uuid().optional(),
  course_id: z.uuid(e.invalid),
  title,
  slug,
  short_description: z.string().trim().max(300).default(""),
  brief_md: md,
  steps_md: md,
  deliverable_md: md,
  cover_url: optionalUrl,
  level,
  hours: z
    .string()
    .default("")
    .transform((v) => (v.trim() ? Number(v) : null))
    .pipe(z.number().int().min(0).max(200).nullable()),
  skills: lines,
  is_published: checkbox,
});

export async function saveProject(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await adminContext();
  if (!ctx) return { status: "error", error: e.forbidden };
  const parsed = projectSchema.safeParse({
    id: fd(form, "id") || undefined,
    course_id: fd(form, "course_id"),
    title: fd(form, "title"),
    slug: fd(form, "slug"),
    short_description: fd(form, "short_description"),
    brief_md: fd(form, "brief_md"),
    steps_md: fd(form, "steps_md"),
    deliverable_md: fd(form, "deliverable_md"),
    cover_url: fd(form, "cover_url") ?? "",
    level: fd(form, "level"),
    hours: fd(form, "hours"),
    skills: fd(form, "skills"),
    is_published: form.get("is_published"),
  });
  if (!parsed.success) return { status: "error", error: firstError(parsed.error) };
  const { id, ...values } = parsed.data;
  if (id) {
    const { error } = await ctx.supabase.from("projects").update(values).eq("id", id);
    if (error) return { status: "error", error: dbErrorMessage(error) };
    await audit(ctx.supabase, ctx.userId, "update", "project", id, { title: values.title });
    refresh();
    return { status: "saved" };
  }
  const { count } = await ctx.supabase.from("projects").select("id", { count: "exact", head: true }).eq("course_id", values.course_id);
  const { data, error } = await ctx.supabase
    .from("projects")
    .insert({ ...values, position: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { status: "error", error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, "create", "project", data.id, { title: values.title });
  refresh();
  redirect(`/loyihalar/${data.id}`);
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  // Files are not removed by the database cascade: collect them first.
  const [{ data: files }, { data: workbooks }] = await Promise.all([
    ctx.supabase.from("lesson_resources").select("file_path").eq("project_id", id).not("file_path", "is", null),
    ctx.supabase.from("assignments").select("file_path").eq("project_id", id).not("file_path", "is", null),
  ]);
  const { error } = await ctx.supabase.from("projects").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  const resourcePaths = (files ?? []).map((f) => f.file_path).filter((p): p is string => Boolean(p));
  const workbookPaths = (workbooks ?? []).map((f) => f.file_path).filter((p): p is string => Boolean(p));
  if (resourcePaths.length) await ctx.supabase.storage.from("lesson-resources").remove(resourcePaths);
  if (workbookPaths.length) await ctx.supabase.storage.from("assignment-files").remove(workbookPaths);
  await audit(ctx.supabase, ctx.userId, "delete", "project", id);
  refresh();
  redirect("/loyihalar");
}

const reviewSchema = z.object({
  id: z.uuid(),
  status: z.enum(["approved", "needs_work"]),
  feedback: z.string().trim().max(4000),
});

export async function reviewSubmission(input: z.input<typeof reviewSchema>): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return forbidden;
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const { id, ...values } = parsed.data;
  const { error } = await ctx.supabase
    .from("project_submissions")
    .update({ ...values, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await audit(ctx.supabase, ctx.userId, values.status === "approved" ? "approve" : "return", "submission", id);
  refresh();
  return { ok: true, message: uz.admin.projects.reviewSaved };
}
