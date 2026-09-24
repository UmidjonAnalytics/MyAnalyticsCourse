import { BookOpen, Layers, ListVideo, Monitor, Users } from "lucide-react";
import { Notice } from "@/components/Notice";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };
  const [students, courses, lessons, bundles, devices] = await Promise.all([
    supabase.from("profiles").select("id", count).eq("role", "student"),
    supabase.from("courses").select("id", count).is("archived_at", null),
    supabase.from("lessons").select("id", count).is("archived_at", null),
    supabase.from("bundles").select("id", count).is("archived_at", null),
    supabase.from("device_sessions").select("id", count).is("revoked_at", null),
  ]);

  const failed = [students, courses, lessons, bundles, devices].some((r) => r.error);
  const stats = [
    { label: uz.admin.dashboard.students, value: students.count, Icon: Users },
    { label: uz.admin.dashboard.courses, value: courses.count, Icon: BookOpen },
    { label: uz.admin.dashboard.lessons, value: lessons.count, Icon: ListVideo },
    { label: uz.admin.dashboard.bundles, value: bundles.count, Icon: Layers },
    { label: uz.admin.dashboard.activeDevices, value: devices.count, Icon: Monitor },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">{uz.admin.dashboard.title}</h1>
      <p className="mt-1 text-muted">{uz.admin.dashboard.lead}</p>
      {failed ? (
        <div className="mt-6">
          <Notice tone="error">{uz.errors.generic}</Notice>
        </div>
      ) : null}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, Icon }) => (
          <li key={label} className="card p-5">
            <span className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </span>
            <span className="mt-2 block font-display text-3xl font-bold">{value ?? "—"}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Notice>{uz.admin.dashboard.phaseNote}</Notice>
      </div>
    </div>
  );
}
