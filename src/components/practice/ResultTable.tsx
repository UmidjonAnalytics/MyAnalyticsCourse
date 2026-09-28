import type { Cell } from "@/lib/practice/checker";

const DISPLAY_ROWS = 200;

function show(v: Cell) {
  if (v === null) return <span className="text-muted">NULL</span>;
  if (typeof v === "number") return Number.isInteger(v) ? v : Math.round(v * 10000) / 10000;
  return String(v);
}

// Query result as a scrollable table (first 200 rows).
export function ResultTable({ columns, rows, caption }: { columns: string[]; rows: Cell[][]; caption?: string }) {
  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-border">
      <table className="w-max min-w-full border-collapse text-left font-mono text-xs">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="sticky top-0 bg-surface-muted">
          <tr>
            <th scope="col" className="border-b border-border px-2 py-1.5 text-right font-semibold text-muted">
              #
            </th>
            {columns.map((c, i) => (
              <th key={`${c}-${i}`} scope="col" className="whitespace-nowrap border-b border-border px-3 py-1.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, DISPLAY_ROWS).map((row, r) => (
            <tr key={r} className="odd:bg-surface even:bg-bg">
              <td className="px-2 py-1 text-right text-muted">{r + 1}</td>
              {row.map((v, c) => (
                <td key={c} className={`whitespace-nowrap px-3 py-1 ${typeof v === "number" ? "text-right" : ""}`}>
                  {show(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
