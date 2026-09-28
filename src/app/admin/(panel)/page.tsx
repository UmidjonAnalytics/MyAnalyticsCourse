import { BookOpen, CreditCard, TrendingUp, UserCheck, Users } from "lucide-react";
import { Notice } from "@/components/Notice";
import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

type Stats = {
  students: number;
  paying_students: number;
  active_7d: number;
  revenue: { today: number; month: number; total: number };
  by_provider: Array<{ provider: string; total: number; orders: number }>;
  by_product: Array<{ title: string; type: string; total: number; orders: number }>;
  drop_off: Array<{ course: string; lesson: string; students: number }>;
};

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [{ data, error }, courses] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase.from("courses").select("id", { count: "exact", head: true }).is("archived_at", null),
  ]);
  const t = uz.admin.dashboard;
  const s = data as Stats | null;

  if (error || !s) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="mt-6">
          <Notice tone="error">{uz.errors.generic}</Notice>
        </div>
      </div>
    );
  }

  const tiles = [
    { label: t.revenueToday, value: formatSom(s.revenue.today), Icon: TrendingUp },
    { label: t.revenueMonth, value: formatSom(s.revenue.month), Icon: TrendingUp },
    { label: t.revenueTotal, value: formatSom(s.revenue.total), Icon: CreditCard },
    { label: t.students, value: String(s.students), Icon: Users },
    { label: t.payingStudents, value: String(s.paying_students), Icon: UserCheck },
    { label: t.active7d, value: String(s.active_7d), Icon: Users },
    { label: t.courses, value: String(courses.count ?? 0), Icon: BookOpen },
  ];
  const maxProduct = Math.max(1, ...s.by_product.map((p) => p.total));

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ label, value, Icon }) => (
          <li key={label} className="card p-5">
            <span className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </span>
            <span className="mt-2 block font-display text-2xl font-bold">{value}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="by-product">
          <h2 id="by-product" className="font-bold">
            {t.byProduct}
          </h2>
          {s.by_product.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t.none}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {s.by_product.map((p) => (
                <li key={p.title}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-semibold">{p.title}</span>
                    <span>
                      {formatSom(p.total)} <span className="text-muted">· {t.ordersCount(p.orders)}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface-muted" aria-hidden="true">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(p.total / maxProduct) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5" aria-labelledby="by-provider">
          <h2 id="by-provider" className="font-bold">
            {t.byProvider}
          </h2>
          {s.by_provider.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t.none}</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-border">
                {s.by_provider.map((p) => (
                  <tr key={p.provider}>
                    <td className="py-2 font-semibold">{uz.checkout.providers[p.provider] ?? p.provider}</td>
                    <td className="py-2 text-muted">{t.ordersCount(p.orders)}</td>
                    <td className="py-2 text-right font-semibold">{formatSom(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card p-5 lg:col-span-2" aria-labelledby="drop-off">
          <h2 id="drop-off" className="font-bold">
            {t.dropOff}
          </h2>
          <p className="text-sm text-muted">{t.dropOffLead}</p>
          {s.drop_off.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t.none}</p>
          ) : (
            <ol className="mt-3 divide-y divide-border text-sm">
              {s.drop_off.map((d) => (
                <li key={d.course + d.lesson} className="flex justify-between gap-3 py-2">
                  <span>
                    <span className="font-semibold">{d.lesson}</span> <span className="text-muted">· {d.course}</span>
                  </span>
                  <span>{t.studentsCount(d.students)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
