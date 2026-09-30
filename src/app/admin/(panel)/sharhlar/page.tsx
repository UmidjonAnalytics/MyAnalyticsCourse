import type { Metadata } from "next";
import { Star } from "lucide-react";
import { setReviewHidden } from "@/app/admin/(panel)/actions/learning";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.reviews.title };

export default async function Reviews() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_reviews")
    .select("id, rating, body, created_at, hidden_at, profiles(full_name, phone), courses(title)")
    .order("created_at", { ascending: false })
    .limit(200);
  const t = uz.admin.reviews;
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>
      <ul className="mt-6 space-y-3">
        {(data ?? []).map((r) => (
          <li key={r.id} className={`card p-4 sm:p-5 ${r.hidden_at ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold">{r.profiles?.full_name || r.profiles?.phone || "—"}</span>
              <span className="inline-flex items-center gap-0.5" aria-label={uz.reviews.stars(r.rating)} role="img">
                {Array.from({ length: r.rating }, (_, i) => (
                  <Star key={i} className="size-4 fill-star text-star" aria-hidden="true" />
                ))}
              </span>
              <span className="text-muted">{r.courses?.title}</span>
              <time dateTime={r.created_at} className="text-muted">
                {formatDateTime(r.created_at)}
              </time>
              {r.hidden_at ? <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold">{t.hidden}</span> : null}
            </div>
            {r.body ? <p className="mt-2 whitespace-pre-wrap break-words">{r.body}</p> : null}
            <div className="mt-3">
              <ConfirmButton
                label={r.hidden_at ? t.show : t.hide}
                action={setReviewHidden.bind(null, r.id, !r.hidden_at)}
                className={r.hidden_at ? "btn-secondary" : "btn-danger"}
                danger={!r.hidden_at}
              />
            </div>
          </li>
        ))}
        {!data?.length ? <li className="card p-5 text-muted">{t.empty}</li> : null}
      </ul>
    </div>
  );
}
