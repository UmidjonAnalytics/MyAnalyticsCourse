"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award, CheckCircle2, CircleX, Loader2, RotateCcw, Send } from "lucide-react";
import { submitQuiz, type QuizQuestionResult } from "@/app/(learn)/dars/actions";
import { Notice } from "@/components/Notice";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";

const t = uz.quiz;

export type QuizQuestionView = { id: string; prompt: string; options: string[]; multiple: boolean };
export type QuizAttemptView = { id: string; correct: number; total: number; passed: boolean; created_at: string };

type Outcome = { results: Map<string, QuizQuestionResult>; correct: number; total: number; percent: number; passed: boolean };

export function QuizPanel({
  lessonId,
  courseSlug,
  passPercent,
  questions,
  attempts: initialAttempts,
}: {
  lessonId: string;
  courseSlug: string;
  passPercent: number;
  questions: QuizQuestionView[];
  attempts: QuizAttemptView[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(initialAttempts);
  const [pending, startTransition] = useTransition();
  const everPassed = attempts.some((a) => a.passed);
  const best = attempts.reduce((m, a) => Math.max(m, Math.round((a.correct / Math.max(a.total, 1)) * 100)), 0);
  const locked = Boolean(outcome);

  const toggle = (q: QuizQuestionView, index: number) => {
    if (locked) return;
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      const next = q.multiple ? (cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index]) : [index];
      return { ...prev, [q.id]: next };
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (questions.some((q) => !answers[q.id]?.length)) {
      setError(t.answerAll);
      return;
    }
    startTransition(async () => {
      const res = await submitQuiz({ lessonId, courseSlug, answers });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOutcome({ results: new Map(res.results.map((r) => [r.questionId, r])), correct: res.correct, total: res.total, percent: res.percent, passed: res.passed });
      setAttempts((prev) => [
        { id: crypto.randomUUID(), correct: res.correct, total: res.total, passed: res.passed, created_at: new Date().toISOString() },
        ...prev,
      ]);
      if (res.passed) router.refresh();
    });
  };

  const retry = () => {
    // Keep the right answers, clear the wrong ones.
    if (outcome) setAnswers((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => outcome.results.get(id)?.correct)));
    setOutcome(null);
    setError(null);
  };

  return (
    <section aria-labelledby="quiz-title" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="quiz-title" className="flex items-center gap-2 text-xl font-bold">
            <Award className="size-5 text-accent-text" aria-hidden="true" />
            {t.title}
          </h2>
          <p className="mt-1 text-sm text-muted">{t.lead(passPercent)}</p>
        </div>
        {everPassed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-text">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t.passedBadge}
          </span>
        ) : attempts.length > 0 ? (
          <span className="text-sm text-muted">{t.best(best)}</span>
        ) : null}
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <ol className="space-y-4">
          {questions.map((q, qi) => {
            const r = outcome?.results.get(q.id);
            const chosen = answers[q.id] ?? [];
            const name = `quiz-${q.id}`;
            return (
              <li key={q.id} className={`card p-5 ${r ? (r.correct ? "border-accent" : "border-danger") : ""}`}>
                <fieldset>
                  <legend className="w-full">
                    <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
                      {t.questionOf(qi + 1, questions.length)}
                      {r ? (
                        <span className={`inline-flex items-center gap-1 normal-case ${r.correct ? "text-accent-text" : "text-danger"}`}>
                          {r.correct ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <CircleX className="size-4" aria-hidden="true" />}
                          {r.correct ? t.correct : t.wrong}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-2 block whitespace-pre-wrap font-semibold">{q.prompt}</span>
                    <span className="mt-1 block text-sm text-muted">{q.multiple ? t.multiple : t.single}</span>
                  </legend>
                  <div className="mt-3 space-y-2">
                    {q.options.map((opt, oi) => {
                      const checked = chosen.includes(oi);
                      const isRight = r?.correctOptions?.includes(oi);
                      return (
                        <label
                          key={oi}
                          className={`flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2.5 ${
                            isRight ? "border-accent bg-accent-soft" : checked ? "border-border-strong bg-surface-muted" : "border-border"
                          } ${locked ? "" : "cursor-pointer hover:bg-surface-muted"}`}
                        >
                          <input
                            type={q.multiple ? "checkbox" : "radio"}
                            name={name}
                            checked={checked}
                            disabled={locked}
                            onChange={() => toggle(q, oi)}
                            className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
                          />
                          <span className="flex-1">{opt}</span>
                          {isRight ? <span className="text-xs font-semibold text-accent-text">{t.rightAnswer}</span> : null}
                        </label>
                      );
                    })}
                  </div>
                  {r?.explanation ? <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm">{r.explanation}</p> : null}
                </fieldset>
              </li>
            );
          })}
        </ol>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {outcome ? (
          <Notice tone={outcome.passed ? "success" : "info"}>
            {outcome.passed ? t.passed(outcome.correct, outcome.total, outcome.percent) : t.failed(outcome.correct, outcome.total, outcome.percent, passPercent)}
          </Notice>
        ) : null}

        {outcome ? (
          <button key="retry" type="button" className="btn-secondary" onClick={retry}>
            <RotateCcw className="size-4" aria-hidden="true" />
            {t.retry}
          </button>
        ) : (
          <button key="submit" type="submit" className="btn-primary" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
            {pending ? t.submitting : t.submit}
          </button>
        )}
      </form>

      {attempts.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-muted">
            {t.history} ({attempts.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {attempts.slice(0, 10).map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                {a.passed ? <CheckCircle2 className="size-4 text-accent-text" aria-hidden="true" /> : <CircleX className="size-4 text-danger" aria-hidden="true" />}
                <span className="font-medium">{t.attempt(a.correct, a.total)}</span>
                <time dateTime={a.created_at} className="text-muted">
                  {formatDateTime(a.created_at)}
                </time>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
