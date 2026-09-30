import type { Metadata } from "next";
import { revokeCertificate } from "@/app/admin/(panel)/actions/learning";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { publicSiteUrl } from "@/lib/admin/links";
import { formatDate } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.certificates.title };

export default async function Certificates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("id, code, full_name, course_title, hours, issued_at, revoked_at, profiles(phone)")
    .order("issued_at", { ascending: false })
    .limit(300);
  const site = await publicSiteUrl();
  const t = uz.admin.certificates;
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>
      <ul className="card mt-6 divide-y divide-border">
        {(data ?? []).map((c) => (
          <li key={c.id} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {c.full_name} <span className="text-sm font-normal text-muted">{c.profiles?.phone ? `+${c.profiles.phone}` : ""}</span>
              </span>
              <span className="text-xs text-muted">
                {c.course_title} · {formatDate(c.issued_at)} · <span className="font-mono">{c.code}</span>
              </span>
            </span>
            {c.revoked_at ? (
              <span className="text-xs font-semibold text-danger">{t.revoked}</span>
            ) : (
              <>
                {site ? (
                  <a href={`${site}/sertifikat/${c.code}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent-text hover:underline">
                    {t.open}
                  </a>
                ) : null}
                <ConfirmButton label={t.revoke} confirm={t.revokeConfirm} action={revokeCertificate.bind(null, c.id)} className="btn-danger" danger />
              </>
            )}
          </li>
        ))}
        {!data?.length ? <li className="p-5 text-muted">{t.empty}</li> : null}
      </ul>
    </div>
  );
}
