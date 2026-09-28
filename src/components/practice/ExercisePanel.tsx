"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, CircleX, Lightbulb, Loader2, Play, ShieldCheck, Table2 } from "lucide-react";
import { Notice } from "@/components/Notice";
import { ResultTable } from "@/components/practice/ResultTable";
import { SqlEditor } from "@/components/practice/SqlEditor";
import { postJson } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import type { CheckResult } from "@/lib/practice/checker";
import { getDuckDB, loadDataset, runQuery, type QueryOutput } from "@/lib/practice/duckdb";

export type PanelDataset = {
  id: string;
  name: string;
  table_name: string;
  row_count: number;
  columns: Array<{ name: string; type: string }>;
};
export type PanelAttempt = { id: string; sql: string; passed: boolean; created_at: string };

const t = uz.practice;

export function ExercisePanel({
  exerciseId,
  number,
  title,
  points,
  task,
  datasets,
  attempts: initialAttempts,
}: {
  exerciseId: string;
  number: number;
  title: string;
  points: number;
  task: React.ReactNode;
  datasets: PanelDataset[];
  attempts: PanelAttempt[];
}) {
  const draftKey = `sql-draft:${exerciseId}`;
  const [sql, setSql] = useState("");
  const [phase, setPhase] = useState<"idle" | "engine" | "data" | "running" | "checking">("idle");
  const [result, setResult] = useState<(QueryOutput & { sql: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState<{ passed: boolean; results: CheckResult[] } | null>(null);
  const [attempts, setAttempts] = useState(initialAttempts);
  const solved = attempts.some((a) => a.passed);

  // Restore the unsent draft (or the last attempt) once, after hydration.
  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(draftKey) ?? "";
    } catch {
      // storage blocked
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser storage
    setSql(saved || initialAttempts[0]?.sql || "");
  }, [draftKey, initialAttempts]);

  const updateSql = (v: string) => {
    setSql(v);
    try {
      localStorage.setItem(draftKey, v);
    } catch {
      // storage blocked
    }
  };

  async function execute(): Promise<(QueryOutput & { sql: string }) | null> {
    setError(null);
    setCheck(null);
    if (!sql.trim()) return null;
    try {
      setPhase("engine");
      await getDuckDB();
    } catch {
      setPhase("idle");
      setError(t.engineError);
      return null;
    }
    try {
      setPhase("data");
      for (const d of datasets) await loadDataset(d);
    } catch {
      setPhase("idle");
      setError(t.dataError);
      return null;
    }
    try {
      setPhase("running");
      const out = { ...(await runQuery(sql)), sql };
      setResult(out);
      return out;
    } catch (err) {
      setResult(null);
      setError(`${t.sqlError}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      setPhase("idle");
    }
  }

  async function submit() {
    const out = result && result.sql === sql ? result : await execute();
    if (!out) return;
    setPhase("checking");
    const res = await postJson<{ passed: boolean; score: number; results: CheckResult[] }>(`/api/exercises/${exerciseId}/check`, {
      sql,
      columns: out.columns,
      rows: out.rows,
    });
    setPhase("idle");
    if (!res.ok) {
      setError(res.code === "exercise_not_ready" ? t.notReady : res.message);
      return;
    }
    setCheck({ passed: res.passed, results: res.results });
    setAttempts((a) => [{ id: crypto.randomUUID(), sql, passed: res.passed, created_at: new Date().toISOString() }, ...a]);
  }

  const busy = phase !== "idle";
  const status =
    phase === "engine" ? t.loadingEngine : phase === "data" ? t.loadingData : phase === "running" ? t.running : phase === "checking" ? t.checking : null;

  return (
    <section className="card overflow-hidden" aria-labelledby={`ex-${exerciseId}`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-surface-muted px-5 py-3">
        <span className="text-xs font-bold uppercase tracking-wide text-accent-text">{t.exercise(number)}</span>
        <h3 id={`ex-${exerciseId}`} className="min-w-0 flex-1 font-bold">
          {title}
        </h3>
        {solved ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            {t.done}
          </span>
        ) : null}
        <span className="text-xs font-semibold text-muted">{t.points(points)}</span>
      </header>

      <div className="space-y-5 p-5">
        <div>{task}</div>

        {datasets.length > 0 ? (
          <div>
            <h4 className="text-sm font-bold">{t.tables}</h4>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {datasets.map((d) => (
                <li key={d.id} className="rounded-lg border border-border">
                  <details className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2">
                      <Table2 className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
                      <span className="font-mono text-sm font-semibold">{d.table_name}</span>
                      <span className="flex-1 text-xs text-muted">{t.rows(d.row_count)}</span>
                      <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                      <span className="sr-only">{t.showColumns}</span>
                    </summary>
                    <ul className="border-t border-border px-3 py-2 font-mono text-xs">
                      {d.columns.map((c) => (
                        <li key={c.name} className="flex justify-between gap-3 py-0.5">
                          <span>{c.name}</span>
                          <span className="text-muted">{c.type.toLowerCase()}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <SqlEditor value={sql} onChange={updateSql} onRun={() => void execute()} />

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary" onClick={() => void execute()} disabled={busy || !sql.trim()}>
            {phase === "running" || phase === "engine" || phase === "data" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            {t.run}
          </button>
          <button type="button" className="btn-primary" onClick={() => void submit()} disabled={busy || !sql.trim()}>
            {phase === "checking" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
            {t.check}
          </button>
          <span className="text-sm text-muted" aria-live="polite">
            {status}
          </span>
        </div>

        {error ? (
          <Notice tone="error">
            <span className="whitespace-pre-wrap font-mono text-xs">{error}</span>
          </Notice>
        ) : null}

        {check ? (
          <div
            className={`rounded-lg border p-4 ${check.passed ? "border-accent bg-accent-soft" : "border-border-strong bg-surface"}`}
            role="status"
            aria-live="polite"
          >
            <p className="flex items-center gap-2 font-bold">
              {check.passed ? (
                <CheckCircle2 className="size-5 text-accent-text" aria-hidden="true" />
              ) : (
                <CircleX className="size-5 text-danger" aria-hidden="true" />
              )}
              {check.passed ? t.passed : t.failed}
            </p>
            <ul className="mt-3 space-y-2">
              {check.results.map((r) => (
                <li key={r.id} className="text-sm">
                  <span className="flex items-center gap-2">
                    {r.passed ? (
                      <CheckCircle2 className="size-4 shrink-0 text-accent-text" aria-label={t.attemptPassed} />
                    ) : (
                      <CircleX className="size-4 shrink-0 text-danger" aria-label={t.attemptFailed} />
                    )}
                    {r.label}
                  </span>
                  {r.hint ? (
                    <span className="ml-6 mt-1 flex items-start gap-1.5 text-muted">
                      <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="font-semibold">{t.hint}:</span> {r.hint}
                      </span>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {result ? (
          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-bold">{t.result}</h4>
              <span className="text-xs text-muted">{t.resultInfo(Math.min(result.rows.length, 200), result.totalRows, result.ms)}</span>
            </div>
            {result.rows.length === 0 ? (
              <p className="text-sm text-muted">{t.noRows}</p>
            ) : (
              <ResultTable columns={result.columns} rows={result.rows} caption={t.result} />
            )}
          </div>
        ) : null}

        <details className="rounded-lg border border-border">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold">
            {t.history} ({attempts.length})
          </summary>
          <div className="border-t border-border px-3 py-2">
            {attempts.length === 0 ? (
              <p className="py-1 text-sm text-muted">{t.historyEmpty}</p>
            ) : (
              <ul className="divide-y divide-border">
                {attempts.slice(0, 10).map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                    <span className={`font-semibold ${a.passed ? "text-accent-text" : "text-danger"}`}>
                      {a.passed ? t.attemptPassed : t.attemptFailed}
                    </span>
                    <span className="text-xs text-muted">{formatDateTime(a.created_at)}</span>
                    <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{a.sql}</code>
                    <button type="button" className="btn-ghost min-h-9 text-xs" onClick={() => updateSql(a.sql)}>
                      {t.loadAttempt}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>
    </section>
  );
}
