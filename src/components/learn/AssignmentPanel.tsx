"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, CircleX, Download, ExternalLink, FileSpreadsheet, Lightbulb, Loader2, ShieldCheck } from "lucide-react";
import { checkAssignment, type AssignmentResult } from "@/app/(learn)/dars/actions";
import { Notice } from "@/components/Notice";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";

const t = uz.assignment;

export type AssignmentQuestionView = { id: string; prompt: string; answer_type: "number" | "text"; placeholder: string };
export type AssignmentAttempt = { id: string; correct: number; total: number; passed: boolean; created_at: string; answers: Record<string, string> };

export function AssignmentPanel({
  assignmentId,
  number,
  title,
  points,
  instructions,
  embedSrc,
  openHref,
  downloadHref,
  questions,
  attempts: initialAttempts,
}: {
  assignmentId: string;
  number: number;
  title: string;
  points: number;
  instructions: React.ReactNode;
  embedSrc: string | null;
  openHref: string | null;
  downloadHref: string | null;
  questions: AssignmentQuestionView[];
  attempts: AssignmentAttempt[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => initialAttempts[0]?.answers ?? {});
  const [results, setResults] = useState<Map<string, AssignmentResult> | null>(null);
  const [summary, setSummary] = useState<{ correct: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(initialAttempts);
  const [pending, startTransition] = useTransition();
  const solved = attempts.some((a) => a.passed);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (questions.some((q) => !(answers[q.id] ?? "").trim())) {
      setError(t.empty);
      return;
    }
    startTransition(async () => {
      const res = await checkAssignment({ assignmentId, answers });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResults(new Map(res.results.map((r) => [r.questionId, r])));
      setSummary({ correct: res.correct, total: res.total });
      setAttempts((prev) => [
        { id: crypto.randomUUID(), correct: res.correct, total: res.total, passed: res.correct === res.total, created_at: new Date().toISOString(), answers },
        ...prev,
      ]);
    });
  };

  return (
    <article className="card overflow-hidden" aria-labelledby={`asg-${assignmentId}`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-5 py-4">
        <FileSpreadsheet className="size-5 text-accent-text" aria-hidden="true" />
        <h3 id={`asg-${assignmentId}`} className="font-bold">
          <span className="text-muted">{t.title} {number}:</span> {title}
        </h3>
        <span className="ml-auto flex items-center gap-2 text-sm">
          {solved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 font-semibold text-accent-text">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {t.correct}
            </span>
          ) : null}
          <span className="text-muted">{uz.practice.points(points)}</span>
        </span>
      </header>

      <div className="space-y-5 p-5">
        {instructions}

        {embedSrc ? (
          <div>
            <div className="overflow-hidden rounded-lg border border-border bg-surface-muted">
              <iframe
                src={embedSrc}
                title={`${t.workbook}: ${title}`}
                className="block h-[60vh] min-h-[420px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <p className="mt-2 text-sm text-muted">{t.embedHint}</p>
          </div>
        ) : null}

        {openHref || downloadHref ? (
          <div className="flex flex-wrap gap-2">
            {openHref ? (
              <a href={openHref} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <ExternalLink className="size-4" aria-hidden="true" />
                {t.open}
              </a>
            ) : null}
            {downloadHref ? (
              <a href={downloadHref} className="btn-secondary" download>
                <Download className="size-4" aria-hidden="true" />
                {t.download}
              </a>
            ) : null}
          </div>
        ) : null}

        {questions.length === 0 ? (
          <Notice tone="info">{t.notReady}</Notice>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-surface-muted/40 p-4 sm:p-5" noValidate>
            <h4 className="font-bold">{t.answers}</h4>
            <ol className="space-y-4">
              {questions.map((q, i) => {
                const r = results?.get(q.id);
                const fieldId = `asg-${assignmentId}-q-${q.id}`;
                const hintId = `${fieldId}-hint`;
                return (
                  <li key={q.id}>
                    <label htmlFor={fieldId} className="block font-medium">
                      <span className="text-muted">{i + 1}.</span> {q.prompt}
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        id={fieldId}
                        className={`input max-w-md ${r ? (r.correct ? "border-accent" : "border-danger") : ""}`}
                        inputMode={q.answer_type === "number" ? "decimal" : "text"}
                        autoComplete="off"
                        maxLength={500}
                        placeholder={q.placeholder || (q.answer_type === "number" ? t.numberHint : "")}
                        value={answers[q.id] ?? ""}
                        onChange={(e) => {
                          setAnswers((a) => ({ ...a, [q.id]: e.target.value }));
                          setResults((m) => {
                            if (!m?.has(q.id)) return m;
                            const copy = new Map(m);
                            copy.delete(q.id);
                            return copy;
                          });
                        }}
                        aria-invalid={r ? !r.correct : undefined}
                        aria-describedby={r?.hint ? hintId : undefined}
                      />
                      {r ? (
                        r.correct ? (
                          <CheckCircle2 className="size-5 shrink-0 text-accent-text" aria-label={t.correct} role="img" />
                        ) : (
                          <CircleX className="size-5 shrink-0 text-danger" aria-label={t.wrong} role="img" />
                        )
                      ) : null}
                    </div>
                    {r?.hint ? (
                      <p id={hintId} className="mt-1.5 flex items-start gap-1.5 text-sm text-muted">
                        <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {r.hint}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {error ? <Notice tone="error">{error}</Notice> : null}
            {summary ? (
              <div aria-live="polite">
                <Notice tone={summary.correct === summary.total ? "success" : "info"}>
                  {summary.correct === summary.total ? t.allCorrect : t.someWrong(summary.correct, summary.total)}
                </Notice>
              </div>
            ) : null}

            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
              {pending ? t.checking : t.check}
            </button>
          </form>
        )}

        {attempts.length > 0 ? (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-muted">
              {t.history} ({attempts.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {attempts.slice(0, 10).map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  {a.passed ? (
                    <CheckCircle2 className="size-4 text-accent-text" aria-hidden="true" />
                  ) : (
                    <CircleX className="size-4 text-danger" aria-hidden="true" />
                  )}
                  <span className="font-medium">{t.attempt(a.correct, a.total)}</span>
                  <time dateTime={a.created_at} className="text-muted">
                    {formatDateTime(a.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </article>
  );
}
