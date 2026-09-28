import type { Metadata } from "next";
import { purgeItem, restoreItem } from "@/app/admin/(panel)/actions/content";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.archive.title };

type Entity = "course" | "module" | "lesson" | "bundle";
type Item = { id: string; title: string; archived_at: string | null; context?: string };

export default async function Archive() {
  const supabase = await createClient();
  const [courses, modules, lessons, bundles] = await Promise.all([
    supabase.from("courses").select("id, title, archived_at").not("archived_at", "is", null).order("archived_at", { ascending: false }),
    supabase
      .from("modules")
      .select("id, title, archived_at, courses(title)")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false }),
    supabase
      .from("lessons")
      .select("id, title, archived_at, courses(title)")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false }),
    supabase.from("bundles").select("id, title, archived_at").not("archived_at", "is", null).order("archived_at", { ascending: false }),
  ]);

  const t = uz.admin;
  const groups: Array<{ entity: Entity; title: string; items: Item[] }> = [
    { entity: "course", title: t.archive.courses, items: courses.data ?? [] },
    { entity: "module", title: t.archive.modules, items: (modules.data ?? []).map((m) => ({ ...m, context: m.courses?.title })) },
    { entity: "lesson", title: t.archive.lessons, items: (lessons.data ?? []).map((l) => ({ ...l, context: l.courses?.title })) },
    { entity: "bundle", title: t.archive.bundles, items: bundles.data ?? [] },
  ];
  const empty = groups.every((g) => g.items.length === 0);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">{t.archive.title}</h1>
      <p className="mt-1 text-muted">{t.archive.lead}</p>
      {empty ? <p className="card mt-6 p-5 text-muted">{t.archive.empty}</p> : null}
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <section key={g.entity} className="mt-6" aria-labelledby={`arch-${g.entity}`}>
            <h2 id={`arch-${g.entity}`} className="text-lg font-bold">
              {g.title}
            </h2>
            <ul className="card mt-2 divide-y divide-border">
              {g.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-muted">
                      {item.context ? `${item.context} · ` : ""}
                      {item.archived_at ? t.archive.archivedAt(formatDateTime(item.archived_at)) : ""}
                    </p>
                  </div>
                  <ConfirmButton label={t.common.restore} action={restoreItem.bind(null, g.entity, item.id)} className="btn-secondary text-sm" />
                  <ConfirmButton
                    label={t.common.purge}
                    confirm={t.common.purgeConfirm}
                    secondConfirm={t.common.purgeConfirm2}
                    action={purgeItem.bind(null, g.entity, item.id)}
                    className="btn-ghost text-sm text-danger"
                    danger
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
