import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteAssignment } from "@/app/admin/(panel)/actions/assignments";
import { AssignmentEditor, type EditorQuestion } from "@/components/admin/AssignmentEditor";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.assignments.edit };

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "id, title, instructions_md, points, is_published, embed_url, file_path, allow_download, lesson_id, lessons(title, courses(title)), assignment_submissions(count)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!assignment) notFound();

  const { data: questions } = await supabase
    .from("assignment_questions")
    .select("id, prompt, answer_type, placeholder, hint, position, assignment_answer_keys(answers, tolerance, case_sensitive)")
    .eq("assignment_id", id)
    .order("position");
  const t = uz.admin.assignments;

  const editorQuestions: EditorQuestion[] = (questions ?? []).map((q) => {
    const key = Array.isArray(q.assignment_answer_keys) ? q.assignment_answer_keys[0] : q.assignment_answer_keys;
    return {
      id: q.id,
      key: q.id,
      prompt: q.prompt,
      answer_type: q.answer_type,
      placeholder: q.placeholder,
      hint: q.hint,
      answers: (key?.answers ?? []).join("\n"),
      tolerance: Number(key?.tolerance ?? 0),
      case_sensitive: key?.case_sensitive ?? false,
    };
  });

  return (
    <div className="max-w-5xl">
      <Link
        href={`/darslar/${assignment.lesson_id}`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.toLesson}
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {assignment.lessons?.courses?.title} · {assignment.lessons?.title}
          </p>
          <h1 className="text-2xl font-bold">{assignment.title}</h1>
          <p className="text-sm text-muted">{t.submissions(assignment.assignment_submissions[0]?.count ?? 0)}</p>
        </div>
        <ConfirmButton label={t.delete} confirm={t.deleteConfirm} action={deleteAssignment.bind(null, assignment.id)} className="btn-danger" danger />
      </div>
      <AssignmentEditor assignment={assignment} questions={editorQuestions} fileName={null} />
    </div>
  );
}
