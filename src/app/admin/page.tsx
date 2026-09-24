import type { Metadata } from "next";
import { Notice } from "@/components/Notice";
import { createClient } from "@/lib/supabase/server";
import { uz } from "@/lib/i18n/uz";
import { daysAgoIso } from "@/lib/format";

export const metadata: Metadata = { title: uz.admin.title };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const weekAgo = daysAgoIso(7);

  const [total, access, active] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("enrollments").select("user_id").is("revoked_at", null),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .gte("last_seen_at", weekAgo),
  ]);
  const firstError = total.error ?? access.error ?? active.error;
  if (firstError) throw new Error(firstError.message);

  const cards = [
    { label: uz.admin.stats.totalStudents, value: total.count ?? 0 },
    { label: uz.admin.stats.withAccess, value: new Set((access.data ?? []).map((e) => e.user_id)).size },
    { label: uz.admin.stats.active7d, value: active.count ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{uz.admin.title}</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="font-display text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
      <Notice>{uz.admin.phaseNote}</Notice>
    </div>
  );
}
