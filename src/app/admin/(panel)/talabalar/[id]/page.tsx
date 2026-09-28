import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { resetDevices, revokeAccess, setRole } from "@/app/admin/(panel)/actions/students";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { GrantAccessForm } from "@/components/admin/GrantAccessForm";
import { Avatar } from "@/components/Avatar";
import { visibleEmail } from "@/lib/auth/constants";
import { requireAdmin } from "@/lib/auth/session";
import { describeUserAgent, formatDate, formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { formatUzPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.students.detail };

function isActive(e: { revoked_at: string | null; expires_at: string | null }) {
  return !e.revoked_at && (!e.expires_at || new Date(e.expires_at).getTime() > Date.now());
}

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const [enrollmentsRes, devicesRes, coursesRes, bundlesRes, progressRes, providersRes] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, course_id, source, note, granted_at, expires_at, revoked_at, courses(title)")
      .eq("user_id", id)
      .order("granted_at", { ascending: false }),
    supabase.from("device_sessions").select("id, user_agent, last_seen_at").eq("user_id", id).is("revoked_at", null),
    supabase.from("courses").select("id, title, lessons(count)").is("archived_at", null).order("position"),
    supabase.from("bundles").select("id, title").is("archived_at", null).order("position"),
    supabase.from("lesson_progress").select("status, lessons(course_id)").eq("user_id", id).eq("status", "completed"),
    // Login methods live in Supabase Auth; read them with the secret key (admin already checked).
    createAdminClient().auth.admin.getUserById(id),
  ]);

  const t = uz.admin.students;
  const enrollments = enrollmentsRes.data ?? [];
  const activeCourseIds = new Set(
    enrollments.filter(isActive).map((e) => e.course_id),
  );
  const completedByCourse = new Map<string, number>();
  for (const p of progressRes.data ?? []) {
    const cid = p.lessons?.course_id;
    if (cid) completedByCourse.set(cid, (completedByCourse.get(cid) ?? 0) + 1);
  }
  const courses = coursesRes.data ?? [];
  const rawProviders = providersRes.data.user?.app_metadata?.providers;
  const providers: string[] = Array.isArray(rawProviders) ? rawProviders.filter((p): p is string => typeof p === "string") : [];
  const email = visibleEmail(profile.email);
  const card = "card p-5 sm:p-6";

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/talabalar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.title}
      </Link>

      <section className={card}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={profile.full_name || "?"} url={profile.avatar_url} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{profile.full_name || t.noName}</h1>
            <p className="text-sm text-muted">
              {profile.role === "admin" ? t.roleAdmin : t.roleStudent} · {t.registered}: {formatDate(profile.created_at)}
            </p>
          </div>
          {profile.id !== me.id ? (
            profile.role === "admin" ? (
              <ConfirmButton label={t.makeStudent} confirm={t.makeStudentConfirm} action={setRole.bind(null, id, "student")} />
            ) : (
              <ConfirmButton label={t.makeAdmin} confirm={t.makeAdminConfirm} action={setRole.bind(null, id, "admin")} />
            )
          ) : null}
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-semibold">{t.phone}</dt>
            <dd className="mt-1 font-mono">{profile.phone ? formatUzPhone(profile.phone) : t.never}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t.email}</dt>
            <dd className="mt-1 break-all">{email ?? t.never}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t.methods}</dt>
            <dd className="mt-1">{providers.filter((p) => p !== "email" || email).join(", ") || t.never}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t.lastSeen}</dt>
            <dd className="mt-1">{profile.last_seen_at ? formatDateTime(profile.last_seen_at) : t.never}</dd>
          </div>
        </dl>
      </section>

      <section className={card} aria-labelledby="access">
        <h2 id="access" className="text-lg font-bold">
          {t.access}
        </h2>
        {enrollments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t.accessEmpty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {enrollments.map((e) => {
              const course = courses.find((c) => c.id === e.course_id);
              const total = course?.lessons[0]?.count ?? 0;
              const done = completedByCourse.get(e.course_id) ?? 0;
              const active = isActive(e);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${active ? "" : "text-muted line-through"}`}>{e.courses?.title ?? "—"}</p>
                    <p className="text-xs text-muted">
                      {t.source[e.source] ?? e.source} · {formatDate(e.granted_at)}
                      {e.note ? ` · ${e.note}` : ""}
                      {e.expires_at ? ` · ${t.expires(formatDate(e.expires_at))}` : ""}
                      {e.revoked_at ? ` · ${t.revoked} ${formatDate(e.revoked_at)}` : ""}
                    </p>
                  </div>
                  {active ? (
                    <>
                      <span className="text-sm text-muted">
                        {t.progress}: {done}/{total}
                      </span>
                      <ConfirmButton
                        label={t.revoke}
                        confirm={t.revokeConfirm}
                        action={revokeAccess.bind(null, e.id, id)}
                        className="btn-ghost text-sm text-danger"
                        danger
                      />
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-3 font-bold">{t.grantTitle}</h3>
          <GrantAccessForm
            userId={id}
            courses={courses.filter((c) => !activeCourseIds.has(c.id)).map((c) => ({ id: c.id, title: c.title }))}
            bundles={bundlesRes.data ?? []}
          />
        </div>
      </section>

      <section className={card} aria-labelledby="devices">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="devices" className="text-lg font-bold">
            {t.devices}
          </h2>
          {(devicesRes.data ?? []).length > 0 ? (
            <ConfirmButton label={t.resetDevices} confirm={t.resetConfirm} action={resetDevices.bind(null, id)} className="btn-danger" danger />
          ) : null}
        </div>
        <ul className="mt-3 divide-y divide-border text-sm">
          {(devicesRes.data ?? []).map((d) => (
            <li key={d.id} className="flex justify-between gap-3 py-2">
              <span>{describeUserAgent(d.user_agent) ?? uz.profile.unknownDevice}</span>
              <span className="text-muted">{formatDateTime(d.last_seen_at)}</span>
            </li>
          ))}
          {(devicesRes.data ?? []).length === 0 ? <li className="py-2 text-muted">{uz.profile.devicesEmpty}</li> : null}
        </ul>
      </section>
    </div>
  );
}
