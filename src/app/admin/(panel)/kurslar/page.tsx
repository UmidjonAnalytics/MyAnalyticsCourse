import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { archiveItem } from "@/app/admin/(panel)/actions/content";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PublishSwitch } from "@/components/admin/PublishSwitch";
import { SortableList } from "@/components/admin/SortableList";
import { Notice } from "@/components/Notice";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.courses.title };

export default async function AdminCourses() {
  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, slug, price, is_published, categories(name), lessons(count)")
    .is("archived_at", null)
    .order("position");

  const t = uz.admin;
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.courses.title}</h1>
          <p className="mt-1 text-muted">{t.courses.lead}</p>
        </div>
        <Link href="/kurslar/yangi" className="btn-primary">
          <Plus className="size-4" aria-hidden="true" />
          {t.courses.new}
        </Link>
      </div>

      <div className="card mt-6 overflow-hidden">
        {error ? (
          <div className="p-5">
            <Notice tone="error">{t.common.loadError}</Notice>
          </div>
        ) : !courses?.length ? (
          <p className="p-5 text-muted">{t.common.empty}</p>
        ) : (
          <SortableList
            table="courses"
            items={courses.map((c) => ({
              id: c.id,
              label: c.title,
              content: (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 pr-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/kurslar/${c.id}`} className="font-semibold hover:underline">
                      {c.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {c.categories?.name ?? t.common.noCategory} · {t.courses.lessons(c.lessons[0]?.count ?? 0)} · {formatSom(c.price)}
                    </p>
                  </div>
                  <PublishSwitch entity="course" id={c.id} name={c.title} value={c.is_published} />
                  <Link href={`/kurslar/${c.id}/darslar`} className="btn-ghost text-sm">
                    {t.courses.curriculum}
                  </Link>
                  <ConfirmButton
                    label={t.common.archive}
                    confirm={t.common.archiveConfirm}
                    action={archiveItem.bind(null, "course", c.id)}
                    className="btn-ghost text-sm text-danger"
                  />
                </div>
              ),
            }))}
          />
        )}
      </div>
    </div>
  );
}
