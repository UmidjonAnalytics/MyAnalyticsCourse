"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { setLessonProgress } from "@/app/(learn)/dars/actions";
import { Notice } from "@/components/Notice";
import { uz } from "@/lib/i18n/uz";

// "Darsni tugatdim" button. Also records that the lesson was opened (status "started").
export function LessonActions({
  lessonId,
  courseSlug,
  completed,
  nextHref,
  quizRequired = false,
}: {
  lessonId: string;
  courseSlug: string;
  completed: boolean;
  nextHref: string | null;
  /** Lessons with a quiz are completed by passing it. */
  quizRequired?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void setLessonProgress({ lessonId, courseSlug, status: "started" });
  }, [lessonId, courseSlug]);

  const set = (status: "completed" | "reset") =>
    startTransition(async () => {
      setError(null);
      const res = await setLessonProgress({ lessonId, courseSlug, status });
      if (!res.ok) {
        setError(res.error ?? uz.errors.generic);
        return;
      }
      if (status === "completed" && nextHref) router.push(nextHref);
      else router.refresh();
    });

  return (
    <div className="space-y-3">
      {completed ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-soft px-4 font-semibold text-accent-text">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            {uz.lesson.done}
          </span>
          {quizRequired ? null : (
            <button type="button" className="btn-ghost text-sm" onClick={() => set("reset")} disabled={pending}>
              {uz.lesson.undo}
            </button>
          )}
        </div>
      ) : quizRequired ? (
        <a href="#test" className="btn-secondary" title={uz.quiz.mustPass}>
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {uz.quiz.goToQuiz}
        </a>
      ) : (
        <button type="button" className="btn-primary" onClick={() => set("completed")} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
          {pending ? uz.lesson.marking : uz.lesson.markDone}
        </button>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
