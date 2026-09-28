"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Plus, Save, Trash2 } from "lucide-react";
import { saveExercise, saveExpected } from "@/app/admin/(panel)/actions/practice";
import { MarkdownField } from "@/components/admin/fields";
import { toast } from "@/components/admin/toast";
import { Notice } from "@/components/Notice";
import { ResultTable } from "@/components/practice/ResultTable";
import { SqlEditor } from "@/components/practice/SqlEditor";
import { uz } from "@/lib/i18n/uz";
import type { Cell, CheckRule } from "@/lib/practice/checker";
import { DEFAULT_TOLERANCE } from "@/lib/practice/checker";
import { loadDataset, runQuery, type QueryOutput } from "@/lib/practice/duckdb";

const t = uz.admin.exercises;

type DatasetOption = { id: string; name: string; table_name: string; row_count: number };
type SumRule = { id: string; column: string; tolerance: number; hint: string };
type RuleState = {
  columns: { on: boolean; ordered: boolean; hint: string };
  rowCount: { on: boolean; hint: string };
  rows: { on: boolean; ordered: boolean; tolerance: number; hint: string };
  sums: SumRule[];
};

function fromRules(rules: CheckRule[]): RuleState {
  const cols = rules.find((r) => r.type === "columns");
  const count = rules.find((r) => r.type === "row_count");
  const rows = rules.find((r) => r.type === "rows");
  return {
    columns: { on: Boolean(cols), ordered: cols?.type === "columns" ? Boolean(cols.ordered) : false, hint: cols?.hint ?? "" },
    rowCount: { on: Boolean(count), hint: count?.hint ?? "" },
    rows: {
      on: Boolean(rows),
      ordered: rows?.type === "rows" ? Boolean(rows.ordered) : false,
      tolerance: rows?.type === "rows" ? (rows.tolerance ?? DEFAULT_TOLERANCE) : DEFAULT_TOLERANCE,
      hint: rows?.hint ?? "",
    },
    sums: rules
      .filter((r): r is Extract<CheckRule, { type: "column_sum" }> => r.type === "column_sum")
      .map((r) => ({ id: r.id, column: r.column, tolerance: r.tolerance ?? DEFAULT_TOLERANCE, hint: r.hint ?? "" })),
  };
}

function toRules(s: RuleState): CheckRule[] {
  const out: CheckRule[] = [];
  const hint = (h: string) => (h.trim() ? { hint: h.trim() } : {});
  if (s.columns.on) out.push({ id: "cols", type: "columns", ordered: s.columns.ordered, ...hint(s.columns.hint) });
  if (s.rowCount.on) out.push({ id: "count", type: "row_count", ...hint(s.rowCount.hint) });
  if (s.rows.on) out.push({ id: "rows", type: "rows", ordered: s.rows.ordered, tolerance: s.rows.tolerance, ...hint(s.rows.hint) });
  for (const r of s.sums) if (r.column.trim()) out.push({ id: r.id, type: "column_sum", column: r.column.trim(), tolerance: r.tolerance, ...hint(r.hint) });
  return out;
}

function HintInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      aria-label={`${label}: ${t.hint}`}
      placeholder={t.hint}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={500}
      className="input mt-2 text-sm"
    />
  );
}

export function ExerciseEditor({
  exercise,
  reference,
  expected,
  rules: initialRules,
  datasets,
  selected,
}: {
  exercise: { id: string; title: string; task_md: string; points: number; is_published: boolean };
  reference: string;
  expected: { columns: string[]; rows: Cell[][] } | null;
  rules: CheckRule[];
  datasets: DatasetOption[];
  selected: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(exercise.title);
  const [points, setPoints] = useState(exercise.points);
  const [published, setPublished] = useState(exercise.is_published);
  const [picked, setPicked] = useState(new Set(selected));
  const [sql, setSql] = useState(reference);
  const [rules, setRules] = useState(() => fromRules(initialRules));
  const [result, setResult] = useState<(QueryOutput & { sql: string }) | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pending, startTransition] = useTransition();

  async function run() {
    setRunError(null);
    setRunning(true);
    try {
      for (const d of datasets.filter((x) => picked.has(x.id))) await loadDataset(d);
      setResult({ ...(await runQuery(sql)), sql });
    } catch (err) {
      setResult(null);
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  const save = (form: HTMLFormElement) =>
    startTransition(async () => {
      const task_md = String(new FormData(form).get("task_md") ?? "");
      const res = await saveExercise({
        id: exercise.id,
        title,
        task_md,
        points,
        is_published: published,
        dataset_ids: [...picked],
        reference_sql: sql,
        check_rules: toRules(rules),
      });
      if (res.ok) toast(res.message ?? uz.admin.common.saved);
      else toast(res.error, "error");
      router.refresh();
    });

  const storeExpected = () =>
    startTransition(async () => {
      if (!result) return;
      const res = await saveExpected({ id: exercise.id, reference_sql: result.sql, columns: result.columns, rows: result.rows });
      if (res.ok) toast(res.message ?? t.expectedSaved);
      else toast(res.error, "error");
      router.refresh();
    });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save(e.currentTarget);
      }}
    >
      <div className="card space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div>
            <label htmlFor="ex-title" className="label">
              {t.titleLabel}
            </label>
            <input id="ex-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </div>
          <div>
            <label htmlFor="ex-points" className="label">
              {t.points}
            </label>
            <input
              id="ex-points"
              className="input"
              inputMode="numeric"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value.replace(/\D/g, "")) || 0)}
            />
          </div>
        </div>
        <MarkdownField name="task_md" label={t.task} defaultValue={exercise.task_md} rows={6} />

        <fieldset>
          <legend className="label">{t.datasets}</legend>
          <p className="mb-2 text-xs text-muted">{t.datasetsHint}</p>
          {datasets.length === 0 ? <Notice>{t.noDatasets}</Notice> : null}
          <div className="grid gap-1 sm:grid-cols-2">
            {datasets.map((d) => (
              <label key={d.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-surface-muted">
                <input
                  type="checkbox"
                  checked={picked.has(d.id)}
                  onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(d.id);
                    else next.delete(d.id);
                    setPicked(next);
                  }}
                  className="size-5 accent-[var(--accent)]"
                />
                <span className="font-mono text-sm font-semibold">{d.table_name}</span>
                <span className="text-xs text-muted">{d.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="size-5 accent-[var(--accent)]" />
          <span className="text-sm font-semibold">{t.published}</span>
        </label>
      </div>

      <div className="card space-y-4 p-5 sm:p-6">
        <SqlEditor value={sql} onChange={setSql} onRun={() => void run()} label={t.reference} rows={8} />
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => void run()} disabled={running || !sql.trim() || picked.size === 0}>
            {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            {t.runReference}
          </button>
          <button type="button" className="btn-primary" onClick={storeExpected} disabled={pending || !result || result.sql !== sql}>
            <Save className="size-4" aria-hidden="true" />
            {t.saveExpected}
          </button>
        </div>
        {runError ? (
          <Notice tone="error">
            <span className="whitespace-pre-wrap font-mono text-xs">{runError}</span>
          </Notice>
        ) : null}
        {result ? (
          <div>
            <p className="mb-2 text-xs text-muted">{uz.practice.resultInfo(Math.min(result.rows.length, 200), result.totalRows, result.ms)}</p>
            <ResultTable columns={result.columns} rows={result.rows} />
          </div>
        ) : null}
        <div className="border-t border-border pt-4">
          <h2 className="text-sm font-bold">{t.expected}</h2>
          {expected ? (
            <>
              <p className="mb-2 text-xs text-muted">{t.expectedInfo(expected.rows.length, expected.columns.length)}</p>
              <ResultTable columns={expected.columns} rows={expected.rows} />
            </>
          ) : (
            <div className="mt-2">
              <Notice>{t.expectedNone}</Notice>
            </div>
          )}
        </div>
      </div>

      <fieldset className="card space-y-4 p-5 sm:p-6">
        <legend className="sr-only">{t.rules}</legend>
        <div>
          <h2 className="font-bold">{t.rules}</h2>
          <p className="text-sm text-muted">{t.rulesLead}</p>
        </div>

        <div className="rounded-lg border border-border p-3">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={rules.columns.on}
              onChange={(e) => setRules({ ...rules, columns: { ...rules.columns, on: e.target.checked } })}
              className="size-5 accent-[var(--accent)]"
            />
            {t.ruleColumns}
          </label>
          {rules.columns.on ? (
            <HintInput label={t.ruleColumns} value={rules.columns.hint} onChange={(v) => setRules({ ...rules, columns: { ...rules.columns, hint: v } })} />
          ) : null}
        </div>

        <div className="rounded-lg border border-border p-3">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={rules.rowCount.on}
              onChange={(e) => setRules({ ...rules, rowCount: { ...rules.rowCount, on: e.target.checked } })}
              className="size-5 accent-[var(--accent)]"
            />
            {t.ruleRowCount}
          </label>
          {rules.rowCount.on ? (
            <HintInput label={t.ruleRowCount} value={rules.rowCount.hint} onChange={(v) => setRules({ ...rules, rowCount: { ...rules.rowCount, hint: v } })} />
          ) : null}
        </div>

        <div className="rounded-lg border border-border p-3">
          <label className="flex items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={rules.rows.on}
              onChange={(e) => setRules({ ...rules, rows: { ...rules.rows, on: e.target.checked } })}
              className="size-5 accent-[var(--accent)]"
            />
            {rules.rows.ordered ? t.ruleRowsOrdered : t.ruleRows}
          </label>
          {rules.rows.on ? (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={rules.rows.ordered}
                  onChange={(e) => setRules({ ...rules, rows: { ...rules.rows, ordered: e.target.checked } })}
                  className="size-5 accent-[var(--accent)]"
                />
                {t.ruleRowsOrdered}
              </label>
              <label className="text-sm">
                <span className="text-muted">{t.tolerance}</span>
                <input
                  className="input mt-1 text-sm"
                  inputMode="decimal"
                  value={rules.rows.tolerance}
                  onChange={(e) => setRules({ ...rules, rows: { ...rules.rows, tolerance: Number(e.target.value) || 0 } })}
                />
              </label>
              <div className="sm:col-span-2">
                <HintInput label={t.ruleRows} value={rules.rows.hint} onChange={(v) => setRules({ ...rules, rows: { ...rules.rows, hint: v } })} />
              </div>
            </div>
          ) : null}
        </div>

        {rules.sums.map((r, i) => (
          <div key={r.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-40 flex-1 text-sm">
                <span className="font-semibold">
                  {t.ruleSum}: {t.ruleSumColumn}
                </span>
                <input
                  className="input mt-1 font-mono text-sm"
                  value={r.column}
                  onChange={(e) => setRules({ ...rules, sums: rules.sums.map((x, j) => (j === i ? { ...x, column: e.target.value } : x)) })}
                />
              </label>
              <label className="w-40 text-sm">
                <span className="text-muted">{t.tolerance}</span>
                <input
                  className="input mt-1 text-sm"
                  inputMode="decimal"
                  value={r.tolerance}
                  onChange={(e) =>
                    setRules({ ...rules, sums: rules.sums.map((x, j) => (j === i ? { ...x, tolerance: Number(e.target.value) || 0 } : x)) })
                  }
                />
              </label>
              <button
                type="button"
                className="btn-ghost text-danger"
                onClick={() => setRules({ ...rules, sums: rules.sums.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t.remove}
              </button>
            </div>
            <HintInput
              label={t.ruleSum}
              value={r.hint}
              onChange={(v) => setRules({ ...rules, sums: rules.sums.map((x, j) => (j === i ? { ...x, hint: v } : x)) })}
            />
          </div>
        ))}
        <button
          type="button"
          className="btn-ghost"
          onClick={() =>
            setRules({ ...rules, sums: [...rules.sums, { id: `sum${Date.now()}`, column: "", tolerance: 1, hint: "" }] })
          }
        >
          <Plus className="size-4" aria-hidden="true" />
          {t.addSumRule}
        </button>
      </fieldset>

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {pending ? uz.common.saving : uz.admin.common.save}
        </button>
      </div>
    </form>
  );
}
