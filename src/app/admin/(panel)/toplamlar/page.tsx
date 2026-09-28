import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { archiveItem } from "@/app/admin/(panel)/actions/content";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PublishSwitch } from "@/components/admin/PublishSwitch";
import { SortableList } from "@/components/admin/SortableList";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.bundles.title };

export default async function AdminBundles() {
  const supabase = await createClient();
  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, title, price, is_published, bundle_courses(count)")
    .is("archived_at", null)
    .order("position");
  const t = uz.admin;
  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.bundles.title}</h1>
          <p className="mt-1 text-muted">{t.bundles.lead}</p>
        </div>
        <Link href="/toplamlar/yangi" className="btn-primary">
          <Plus className="size-4" aria-hidden="true" />
          {t.bundles.new}
        </Link>
      </div>
      <div className="card mt-6 overflow-hidden">
        {!bundles?.length ? (
          <p className="p-5 text-muted">{t.common.empty}</p>
        ) : (
          <SortableList
            table="bundles"
            items={bundles.map((b) => ({
              id: b.id,
              label: b.title,
              content: (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 pr-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/toplamlar/${b.id}`} className="font-semibold hover:underline">
                      {b.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {t.bundles.coursesCount(b.bundle_courses[0]?.count ?? 0)} · {formatSom(b.price)}
                    </p>
                  </div>
                  <PublishSwitch entity="bundle" id={b.id} name={b.title} value={b.is_published} />
                  <ConfirmButton
                    label={t.common.archive}
                    confirm={t.common.archiveConfirm}
                    action={archiveItem.bind(null, "bundle", b.id)}
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
