// Compares a student's query result with the stored expected result using check rules.
// Runs on the server only (the expected result never reaches the browser). Pure functions: easy to test.

export type Cell = string | number | boolean | null;
export type ResultSet = { columns: string[]; rows: Cell[][] };

export type CheckRule =
  | { id: string; type: "row_count"; label?: string; hint?: string }
  | { id: string; type: "columns"; label?: string; hint?: string; ordered?: boolean }
  | { id: string; type: "rows"; label?: string; hint?: string; ordered?: boolean; tolerance?: number }
  | { id: string; type: "column_sum"; label?: string; hint?: string; column: string; tolerance?: number };

export type CheckResult = { id: string; label: string; passed: boolean; hint?: string };

export const DEFAULT_TOLERANCE = 0.01;

export function defaultLabel(rule: CheckRule): string {
  switch (rule.type) {
    case "row_count":
      return "Qatorlar soni to'g'ri";
    case "columns":
      return rule.ordered ? "Ustunlar nomi va tartibi to'g'ri" : "Ustun nomlari to'g'ri";
    case "rows":
      return rule.ordered ? "Natija qiymatlari va tartibi to'g'ri" : "Natija qiymatlari to'g'ri";
    case "column_sum":
      return `"${rule.column}" ustunining jami qiymati to'g'ri`;
  }
}

/** The rules every new exercise starts with. */
export function defaultRules(): CheckRule[] {
  return [
    { id: "cols", type: "columns", hint: "Ustunlarni SELECT ichida kerakli nomlar bilan nomlang (AS ...)." },
    { id: "count", type: "row_count", hint: "Qatorlar soni boshqacha. WHERE, GROUP BY yoki takroriy qatorlarni tekshiring." },
    { id: "rows", type: "rows", hint: "Qiymatlar mos kelmadi. Hisob-kitob va filtrlarni qayta ko'rib chiqing." },
  ];
}

const norm = (s: string) => s.trim().toLowerCase();

function toNumber(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && /^-?\d+(\.\d+)?(e-?\d+)?$/i.test(v.trim())) return Number(v);
  return null;
}

export function cellsEqual(a: Cell, b: Cell, tolerance = DEFAULT_TOLERANCE): boolean {
  if (a === null || b === null) return a === b;
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na !== null && nb !== null) return Math.abs(na - nb) <= Math.max(tolerance, Math.abs(nb) * 1e-9);
  return String(a).trim() === String(b).trim();
}

/** Student column index for every expected column (by name, else by position). */
function columnMap(student: ResultSet, expected: ResultSet): number[] {
  const byName = expected.columns.map((c) => student.columns.findIndex((s) => norm(s) === norm(c)));
  if (byName.every((i) => i >= 0)) return byName;
  return expected.columns.map((_, i) => (i < student.columns.length ? i : -1));
}

function sortKey(row: Cell[]): string {
  return JSON.stringify(row.map((v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v === null ? null : String(v).trim())));
}

function rowsMatch(student: ResultSet, expected: ResultSet, ordered: boolean, tolerance: number): boolean {
  if (student.rows.length !== expected.rows.length) return false;
  const map = columnMap(student, expected);
  if (map.some((i) => i < 0)) return false;
  let got = student.rows.map((r) => map.map((i) => r[i] ?? null));
  let want = expected.rows;
  if (!ordered) {
    got = [...got].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
    want = [...want].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  }
  return want.every((row, r) => row.every((cell, c) => cellsEqual(got[r]?.[c] ?? null, cell, tolerance)));
}

function columnSum(set: ResultSet, column: string): number | null {
  const idx = set.columns.findIndex((c) => norm(c) === norm(column));
  if (idx < 0) return null;
  return set.rows.reduce((sum, r) => sum + (toNumber(r[idx] ?? null) ?? 0), 0);
}

export function runChecks(student: ResultSet, expected: ResultSet, rules: CheckRule[]): CheckResult[] {
  return rules.map((rule) => {
    let passed = false;
    switch (rule.type) {
      case "row_count":
        passed = student.rows.length === expected.rows.length;
        break;
      case "columns": {
        const s = student.columns.map(norm);
        const e = expected.columns.map(norm);
        passed = rule.ordered
          ? s.length === e.length && s.every((c, i) => c === e[i])
          : s.length === e.length && e.every((c) => s.includes(c));
        break;
      }
      case "rows":
        passed = rowsMatch(student, expected, rule.ordered ?? false, rule.tolerance ?? DEFAULT_TOLERANCE);
        break;
      case "column_sum": {
        const got = columnSum(student, rule.column);
        const want = columnSum(expected, rule.column);
        passed = got !== null && want !== null && cellsEqual(got, want, rule.tolerance ?? DEFAULT_TOLERANCE);
        break;
      }
    }
    return {
      id: rule.id,
      label: rule.label || defaultLabel(rule),
      passed,
      ...(passed || !rule.hint ? {} : { hint: rule.hint }),
    };
  });
}
