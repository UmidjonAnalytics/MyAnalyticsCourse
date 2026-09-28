import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BundleForm } from "@/components/admin/BundleForm";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.bundles.edit };

// Handles both /toplamlar/yangi (new) and /toplamlar/<id> (edit).
export default async function EditBundle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "yangi";
  const supabase = await createClient();
  const [{ data: courses }, bundleRes, linksRes] = await Promise.all([
    supabase.from("courses").select("id, title, price").is("archived_at", null).order("position"),
    isNew ? Promise.resolve({ data: null }) : supabase.from("bundles").select("*").eq("id", id).maybeSingle(),
    isNew ? Promise.resolve({ data: [] }) : supabase.from("bundle_courses").select("course_id").eq("bundle_id", id).order("position"),
  ]);
  const bundle = bundleRes.data;
  if (!isNew && !bundle) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/toplamlar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.admin.bundles.title}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{bundle?.title ?? uz.admin.bundles.new}</h1>
      <BundleForm
        bundle={bundle ?? undefined}
        courses={courses ?? []}
        selected={(linksRes.data ?? []).map((l: { course_id: string }) => l.course_id)}
      />
    </div>
  );
}
