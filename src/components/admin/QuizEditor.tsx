"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { saveQuiz } from "@/app/admin/(panel)/actions/learning";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.quiz;

export type EditorQuizQuestion = {
  id?: string;
  key: string;
  prompt: string;
  options: string[];
  correct: number[];
  multiple: boolean;
  explanation: string;
};

let seq = 0;
const blank = (): EditorQuizQuestion => ({ key: `new-${++seq}`, prompt: "", options: ["", "", "", ""], correct: [], multiple: false, explanation: "" });

function QuestionCard({
  q,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  q: EditorQuizQuestion;
  index: number;
  count: number;
  onChange: (patch: Partial<EditorQuizQuestion>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const n = index + 1;
  const setOption = (i: number, v: string) => onChange({ options: q.options.map((o, j) => (j === i ? v : o)) });
  const toggleCorrect = (i: number) =>
    onChange({ correct: q.multiple ? (q.correct.includes(i) ? q.correct.filter((c) => c !== i) : [...q.correct, i]) : [i] });
  const removeOption = (i: number) =>
    onChange({
      options: q.options.filter((_, j) => j !== i),
      correct: q.correct.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)),
    });

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">
          {t.prompt} {n}
        </span>
        <div className="flex gap-1">
          <button type="button" className="btn-ghost size-9 px-0" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`${t.prompt} ${n}: ↑`}>
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="btn-ghost size-9 px-0" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`${t.prompt} ${n}: ↓`}>
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="btn-ghost size-9 px-0 text-danger" onClick={onRemove} aria-label={t.removeQuestion(n)}>
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-4">
        <div>
          <label htmlFor={`${id}-p`} className="label">
            {t.prompt}
          </label>
          <textarea id={`${id}-p`} className="input min-h-20 py-2" value={q.prompt} maxLength={2000} onChange={(e) => onChange({ prompt: e.target.value })} />
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={q.multiple}
            onChange={(e) => onChange({ multiple: e.target.checked, correct: e.target.checked ? q.correct : q.correct.slice(0, 1) })}
            className="size-5 accent-[var(--accent)]"
          />
          <span className="text-sm font-semibold">{t.multiple}</span>
        </label>
        <fieldset>
          <legend className="label">{t.options}</legend>
          <ul className="space-y-2">
            {q.options.map((opt, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type={q.multiple ? "checkbox" : "radio"}
                  name={`${id}-correct`}
                  checked={q.correct.includes(i)}
                  onChange={() => toggleCorrect(i)}
                  aria-label={t.correctOption(i + 1)}
                  className="size-5 shrink-0 accent-[var(--accent)]"
                />
                <input
                  className="input"
                  value={opt}
                  maxLength={500}
                  onChange={(e) => setOption(i, e.target.value)}
                  aria-label={t.option(i + 1)}
                  placeholder={t.option(i + 1)}
                />
                <button
                  type="button"
                  className="btn-ghost size-9 shrink-0 px-0"
                  onClick={() => removeOption(i)}
                  disabled={q.options.length <= 2}
                  aria-label={t.removeOption(i + 1)}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {q.options.length < 8 ? (
            <button type="button" className="btn-ghost mt-2 text-sm" onClick={() => onChange({ options: [...q.options, ""] })}>
              <Plus className="size-4" aria-hidden="true" />
              {t.addOption}
            </button>
          ) : null}
        </fieldset>
        <div>
          <label htmlFor={`${id}-x`} className="label">
            {t.explanation}
          </label>
          <textarea id={`${id}-x`} className="input min-h-16 py-2 text-sm" value={q.explanation} maxLength={2000} onChange={(e) => onChange({ explanation: e.target.value })} />
        </div>
      </div>
    </li>
  );
}

export function QuizEditor({
  lessonId,
  passPercent: initialPass,
  questions: initial,
  attempts,
}: {
  lessonId: string;
  passPercent: number;
  questions: EditorQuizQuestion[];
  attempts: number;
}) {
  const router = useRouter();
  const [pass, setPass] = useState(initialPass);
  const [questions, setQuestions] = useState(initial);
  const [pending, startTransition] = useTransition();

  const patch = (key: string, p: Partial<EditorQuizQuestion>) => setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...p } : q)));
  const move = (index: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs];
      const [item] = next.splice(index, 1);
      next.splice(index + dir, 0, item!);
      return next;
    });

  const save = () =>
    startTransition(async () => {
      const res = await saveQuiz({
        lessonId,
        passPercent: pass,
        questions: questions.map((q) => ({
          ...(q.id ? { id: q.id } : {}),
          prompt: q.prompt,
          options: q.options,
          correct: q.correct,
          multiple: q.multiple,
          explanation: q.explanation,
        })),
      });
      if (res.ok) toast(res.message ?? uz.admin.common.saved);
      else toast(res.error, "error");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-40">
          <label htmlFor="quiz-pass" className="label">
            {t.passPercent}
          </label>
          <input
            id="quiz-pass"
            className="input"
            inputMode="numeric"
            value={pass}
            onChange={(e) => setPass(Math.min(100, Number(e.target.value.replace(/\D/g, "")) || 0))}
          />
        </div>
        {attempts > 0 ? <p className="pb-3 text-sm text-muted">{t.attempts(attempts)}</p> : null}
      </div>
      {questions.length === 0 ? <p className="text-sm text-muted">{t.empty}</p> : null}
      <ol className="space-y-4">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.key}
            q={q}
            index={i}
            count={questions.length}
            onChange={(p) => patch(q.key, p)}
            onMove={(dir) => move(i, dir)}
            onRemove={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}
          />
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" onClick={() => setQuestions((qs) => [...qs, blank()])}>
          <Plus className="size-4" aria-hidden="true" />
          {t.addQuestion}
        </button>
        <button type="button" className="btn-primary" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {pending ? uz.common.saving : t.save}
        </button>
      </div>
    </div>
  );
}
