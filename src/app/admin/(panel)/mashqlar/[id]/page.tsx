import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteExercise } from "@/app/admin/(panel)/actions/practice";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ExerciseEditor } from "@/components/admin/ExerciseEditor";
import { uz } from "@/lib/i18n/uz";
import type { Cell, CheckRule } from "@/lib/practice/checker";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.exercises.edit };

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, title, task_md, points, is_published, lesson_id, lessons(title, courses(title)), exercise_datasets(dataset_id), exercise_submissions(count)")
    .eq("id", id)
    .maybeSingle();
  if (!exercise) notFound();

  const [{ data: key }, { data: datasets }] = await Promise.all([
    supabase.from("exercise_keys").select("reference_sql, expected, check_rules").eq("exercise_id", id).maybeSingle(),
    supabase.from("datasets").select("id, name, table_name, row_count").is("archived_at", null).order("table_name"),
  ]);
  const t = uz.admin.exercises;

  return (
    <div className="max-w-5xl">
      <Link
        href={`/darslar/${exercise.lesson_id}`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.toLesson}
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {exercise.lessons?.courses?.title} · {exercise.lessons?.title}
          </p>
          <h1 className="text-2xl font-bold">{exercise.title}</h1>
          <p className="text-sm text-muted">{t.submissions(exercise.exercise_submissions[0]?.count ?? 0)}</p>
        </div>
        <ConfirmButton label={t.delete} confirm={t.deleteConfirm} action={deleteExercise.bind(null, exercise.id)} className="btn-danger" danger />
      </div>
      <ExerciseEditor
        exercise={exercise}
        reference={key?.reference_sql ?? ""}
        expected={(key?.expected as { columns: string[]; rows: Cell[][] } | null) ?? null}
        rules={(key?.check_rules as CheckRule[] | null) ?? []}
        datasets={datasets ?? []}
        selected={exercise.exercise_datasets.map((d) => d.dataset_id)}
      />
    </div>
  );
}
