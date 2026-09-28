import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatDateTime, formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { formatUzPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.orders.title };

const STATUSES = ["pending", "paid", "cancelled", "refunded"] as const;
const PROVIDERS = ["payme", "click", "paynet", "test", "free"] as const;
const PAGE = 50;

type SP = Promise<{ holat?: string; tizim?: string; q?: string; sahifa?: string }>;

export default async function Orders({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.sahifa) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, number, status, provider, final_amount, created_at, paid_at, profiles(full_name, phone), courses(title), bundles(title)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.holat && (STATUSES as readonly string[]).includes(sp.holat)) query = query.eq("status", sp.holat as (typeof STATUSES)[number]);
  if (sp.tizim && (PROVIDERS as readonly string[]).includes(sp.tizim)) query = query.eq("provider", sp.tizim as (typeof PROVIDERS)[number]);
  const q = (sp.q ?? "").trim();
  if (/^#?\d{1,9}$/.test(q) && q.replace("#", "").length < 7) query = query.eq("number", Number(q.replace("#", "")));
  else if (q.replace(/\D/g, "").length >= 4) {
    const { data: users } = await supabase.from("profiles").select("id").like("phone", `%${q.replace(/\D/g, "")}%`).limit(50);
    query = query.in("user_id", (users ?? []).map((u) => u.id));
  }
  const { data: orders, count } = await query;
  const t = uz.admin.orders;
  const r = uz.result;
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ holat: sp.holat, tizim: sp.tizim, q: sp.q, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/buyurtmalar${p.size ? `?${p}` : ""}`;
  };
  const chip = (active: boolean) =>
    `inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold ${active ? "border-accent bg-accent text-accent-fg" : "border-border-strong bg-surface hover:bg-surface-muted"}`;

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>
      <div className="mt-4 flex flex-wrap gap-2" aria-label={t.status}>
        <Link href={href({ holat: undefined, sahifa: undefined })} className={chip(!sp.holat)}>
          {t.all}
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={href({ holat: s, sahifa: undefined })} className={chip(sp.holat === s)}>
            {r.statuses[s]}
          </Link>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" aria-label={t.provider}>
        <Link href={href({ tizim: undefined, sahifa: undefined })} className={chip(!sp.tizim)}>
          {t.all}
        </Link>
        {PROVIDERS.map((p) => (
          <Link key={p} href={href({ tizim: p, sahifa: undefined })} className={chip(sp.tizim === p)}>
            {uz.checkout.providers[p] ?? p}
          </Link>
        ))}
      </div>
      <form className="mt-3 flex max-w-md gap-2" role="search">
        {sp.holat ? <input type="hidden" name="holat" value={sp.holat} /> : null}
        {sp.tizim ? <input type="hidden" name="tizim" value={sp.tizim} /> : null}
        <input name="q" defaultValue={sp.q} placeholder={t.search} aria-label={t.search} className="input" />
        <button type="submit" className="btn-secondary">
          <Search className="size-4" aria-hidden="true" />
          {uz.admin.common.search}
        </button>
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-border bg-surface-muted">
            <tr>
              {[t.number, t.student, t.product, t.amount, t.provider, t.status, t.created].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-surface-muted">
                <td className="px-4 py-2">
                  <Link href={`/buyurtmalar/${o.id}`} className="font-mono font-semibold hover:underline">
                    #{o.number}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {o.profiles?.full_name || "—"}
                  <span className="block font-mono text-xs text-muted">{o.profiles?.phone ? formatUzPhone(o.profiles.phone) : ""}</span>
                </td>
                <td className="px-4 py-2">{o.courses?.title ?? o.bundles?.title}</td>
                <td className="whitespace-nowrap px-4 py-2 font-semibold">{formatSom(o.final_amount)}</td>
                <td className="px-4 py-2">{o.provider ? (uz.checkout.providers[o.provider] ?? o.provider) : "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      o.status === "paid" ? "bg-accent-soft text-accent-text" : o.status === "pending" ? "bg-warning-soft" : "bg-surface-muted text-muted"
                    }`}
                  >
                    {r.statuses[o.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-muted">{formatDateTime(o.created_at)}</td>
              </tr>
            ))}
            {!orders?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-muted">
                  {uz.admin.common.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {(count ?? 0) > PAGE ? (
        <nav className="mt-4 flex gap-2" aria-label="Sahifalar">
          {page > 1 ? (
            <Link href={href({ sahifa: String(page - 1) })} className="btn-secondary">
              {uz.admin.students.prev}
            </Link>
          ) : null}
          {page * PAGE < (count ?? 0) ? (
            <Link href={href({ sahifa: String(page + 1) })} className="btn-secondary">
              {uz.admin.students.next}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
