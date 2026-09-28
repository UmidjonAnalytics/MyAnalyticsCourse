import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Notice } from "@/components/Notice";
import { visibleEmail } from "@/lib/auth/constants";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { formatUzPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.students.title };

const PAGE = 50;

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; sahifa?: string }> }) {
  const { q = "", sahifa } = await searchParams;
  const page = Math.max(1, Number(sahifa) || 1);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_students", {
    p_search: q.slice(0, 100),
    p_limit: PAGE,
    p_offset: (page - 1) * PAGE,
  });
  const rows = data ?? [];
  const total = rows[0]?.total_count ?? 0;
  const t = uz.admin.students;
  const pageHref = (p: number) => `/talabalar?${new URLSearchParams({ ...(q ? { q } : {}), sahifa: String(p) })}`;

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <form className="mt-4 flex max-w-xl gap-2" role="search">
        <input name="q" defaultValue={q} placeholder={t.searchPlaceholder} aria-label={t.searchPlaceholder} className="input" />
        <button type="submit" className="btn-primary">
          <Search className="size-4" aria-hidden="true" />
          {uz.admin.common.search}
        </button>
      </form>

      {error ? (
        <div className="mt-6">
          <Notice tone="error">{uz.admin.common.loadError}</Notice>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted">{t.found(total)}</p>
          <div className="card mt-2 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-surface-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">{t.name}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t.phone}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t.email}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t.methods}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t.courses}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t.lastSeen}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <Link href={`/talabalar/${s.id}`} className="font-semibold hover:underline">
                        {s.full_name || t.noName}
                      </Link>
                      {s.role === "admin" ? (
                        <span className="ml-2 rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent-text">admin</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{s.phone ? formatUzPhone(s.phone) : t.never}</td>
                    <td className="px-4 py-3">{visibleEmail(s.email) ?? t.never}</td>
                    <td className="px-4 py-3 text-xs">{s.providers.filter((p) => p !== "email" || visibleEmail(s.email)).join(", ")}</td>
                    <td className="px-4 py-3">{s.course_count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{s.last_seen_at ? formatDateTime(s.last_seen_at) : t.never}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-muted">
                      {uz.admin.common.empty}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {total > PAGE ? (
            <nav className="mt-4 flex gap-2" aria-label="Sahifalar">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="btn-secondary">
                  {t.prev}
                </Link>
              ) : null}
              {page * PAGE < total ? (
                <Link href={pageHref(page + 1)} className="btn-secondary">
                  {t.next}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
