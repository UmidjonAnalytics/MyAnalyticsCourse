import type { Metadata } from "next";
import { moderateComment } from "@/app/admin/(panel)/actions/assignments";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { publicSiteUrl } from "@/lib/admin/links";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.comments.title };

export default async function Comments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_comments")
    .select("id, body, created_at, parent_id, profiles(full_name, phone), lessons(title, slug, courses(title, slug))")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const t = uz.admin.comments;
  const site = await publicSiteUrl();
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>
      <ul className="mt-6 space-y-3">
        {(data ?? []).map((c) => (
          <li key={c.id} className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold">{c.profiles?.full_name || c.profiles?.phone || "—"}</span>
              <time dateTime={c.created_at} className="text-muted">
                {formatDateTime(c.created_at)}
              </time>
              {c.parent_id ? <span className="text-xs text-muted">↳ {uz.discussion.reply}</span> : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words">{c.body}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {c.lessons?.courses && site ? (
                <a
                  href={`${site}/dars/${c.lessons.courses.slug}/${c.lessons.slug}#muhokama`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-accent-text hover:underline"
                >
                  {c.lessons.courses.title} · {c.lessons.title} — {t.open}
                </a>
              ) : (
                <span className="text-sm text-muted">
                  {c.lessons?.courses?.title} · {c.lessons?.title}
                </span>
              )}
              <ConfirmButton label={t.delete} confirm={t.deleteConfirm} action={moderateComment.bind(null, c.id)} className="btn-danger" danger />
            </div>
          </li>
        ))}
        {!data?.length ? <li className="card p-5 text-muted">{t.empty}</li> : null}
      </ul>
    </div>
  );
}
