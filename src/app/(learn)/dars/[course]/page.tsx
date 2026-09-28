import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCourseOutline } from "@/lib/data/catalog";

// /dars/<course> without a lesson: open the next lesson to study (or the course page).
export default async function CourseStart({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;
  const user = await requireUser(`/dars/${course}`);
  const outline = await getCourseOutline(course, user.id);
  if (!outline) notFound();
  redirect(outline.next ? `/dars/${course}/${outline.next.slug}` : `/kurs/${course}`);
}
