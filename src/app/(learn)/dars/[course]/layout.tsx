import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { LearnShell, type ShellOutline } from "@/components/learn/LearnShell";
import { ProfileSections } from "@/components/profile/ProfileSections";
import { requireUser } from "@/lib/auth/session";
import { getCourseOutline } from "@/lib/data/catalog";
import { uz } from "@/lib/i18n/uz";

// Lesson layout: top bar + left learning path + lesson + right profile panel.
export default async function LearnLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ course: string }>;
}) {
  const { course } = await params;
  const user = await requireUser(`/dars/${course}`);
  const outline = await getCourseOutline(course, user.id);
  if (!outline) notFound();

  const shell: ShellOutline = {
    courseSlug: outline.course.slug,
    courseTitle: outline.course.title,
    percent: outline.percent,
    completed: outline.completed,
    total: outline.total,
    modules: outline.modules.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        state: l.state,
        number: l.number,
        minutes: l.duration_minutes,
        free: l.is_free_preview && !outline.hasAccess,
      })),
    })),
  };

  return (
    <LearnShell
      outline={shell}
      userName={user.profile?.full_name || uz.nav.profile}
      avatarUrl={user.profile?.avatar_url ?? null}
      profile={
        <Suspense fallback={<Spinner />}>
          <ProfileSections compact />
        </Suspense>
      }
    >
      {children}
    </LearnShell>
  );
}
