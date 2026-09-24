import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ShieldCheck, ShieldOff } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DeviceList, type DeviceItem } from "@/components/DeviceList";
import { Notice } from "@/components/Notice";
import { getCurrentUser } from "@/lib/auth/session";
import { getAccessibleCourseIds } from "@/lib/data/access";
import { createClient } from "@/lib/supabase/server";
import { uz } from "@/lib/i18n/uz";
import { MAX_DEVICES } from "@/lib/auth/constants";

export const metadata: Metadata = { title: uz.learn.courses };

export default async function LearnPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const supabase = await createClient();
  const [coursesRes, modulesRes, lessonsRes, devicesRes, accessIds] = await Promise.all([
    supabase.from("courses").select("id, title, slug, description").order("position"),
    supabase.from("modules").select("id, course_id"),
    supabase.from("lessons").select("id, module_id"),
    supabase
      .from("device_sessions")
      .select("id, device_id, user_agent, last_seen_at")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false }),
    getAccessibleCourseIds(user.id),
  ]);
  const firstError = coursesRes.error ?? modulesRes.error ?? lessonsRes.error ?? devicesRes.error;
  if (firstError) throw new Error(firstError.message);

  const moduleCourse = new Map((modulesRes.data ?? []).map((m) => [m.id, m.course_id]));
  const lessonCount = new Map<string, number>();
  for (const l of lessonsRes.data ?? []) {
    const courseId = moduleCourse.get(l.module_id);
    if (courseId) lessonCount.set(courseId, (lessonCount.get(courseId) ?? 0) + 1);
  }

  const devices: DeviceItem[] = (devicesRes.data ?? []).map((d) => ({
    id: d.id,
    userAgent: d.user_agent,
    lastSeenAt: d.last_seen_at,
    isCurrent: d.device_id === user.deviceId,
  }));
  const hasAccess = accessIds.size > 0 || user.profile.role === "admin";

  return (
    <>
      <TopBar profile={user.profile} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{uz.learn.welcome(user.profile.full_name)}</h1>
          <Notice>{uz.learn.phaseNote}</Notice>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section aria-labelledby="courses-title" className="card space-y-4 p-6">
            <h2 id="courses-title" className="text-xl font-bold">
              {uz.learn.courses}
            </h2>
            {(coursesRes.data ?? []).length === 0 ? (
              <p className="text-muted">{uz.learn.noCourses}</p>
            ) : (
              <ul className="space-y-3">
                {(coursesRes.data ?? []).map((c) => (
                  <li key={c.id} className="flex gap-3 rounded-lg border border-border p-4">
                    <BookOpen aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-text" />
                    <div className="space-y-1">
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-sm text-muted">{c.description}</p>
                      <p className="text-xs text-muted">{uz.learn.lessonsCount(lessonCount.get(c.id) ?? 0)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-6">
            <section aria-labelledby="access-title" className="card space-y-3 p-6">
              <h2 id="access-title" className="text-xl font-bold">
                {uz.profile.accessStatus}
              </h2>
              {hasAccess ? (
                <p className="flex items-center gap-2 font-semibold text-accent-text">
                  <ShieldCheck aria-hidden className="size-5" />
                  {uz.access.full}
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 font-semibold">
                    <ShieldOff aria-hidden className="size-5" />
                    {uz.access.none}
                  </p>
                  <Link href="/kirish-yoq" className="btn-secondary">
                    {uz.access.contact}
                  </Link>
                </div>
              )}
            </section>

            <section aria-labelledby="devices-title" className="card space-y-3 p-6">
              <div>
                <h2 id="devices-title" className="text-xl font-bold">
                  {uz.devices.title} ({devices.length}/{MAX_DEVICES})
                </h2>
                <p className="text-sm text-muted">{uz.devices.limitNote}</p>
              </div>
              <DeviceList devices={devices} />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
