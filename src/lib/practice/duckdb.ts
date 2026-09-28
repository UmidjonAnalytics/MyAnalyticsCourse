"use client";

import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import type { Cell, ResultSet } from "@/lib/practice/checker";
import extensions from "@/lib/practice/duckdb-extensions.json";

// In-browser SQL engine (DuckDB-WASM). One engine per browser tab, loaded on first use.
// Engine files are served from /duckdb (copied there by scripts/copy-duckdb.mjs).

export const MAX_RESULT_ROWS = 5000; // rows kept from a query (display + checking)

let dbPromise: Promise<{ db: AsyncDuckDB; conn: AsyncDuckDBConnection }> | null = null;
const loadedTables = new Map<string, string>(); // table name -> dataset id

async function init() {
  const duckdb = await import("@duckdb/duckdb-wasm");
  const base = `${window.location.origin}/duckdb`;
  const bundle = await duckdb.selectBundle({
    mvp: { mainModule: `${base}/duckdb-mvp.wasm`, mainWorker: `${base}/duckdb-browser-mvp.worker.js` },
    eh: { mainModule: `${base}/duckdb-eh.wasm`, mainWorker: `${base}/duckdb-browser-eh.worker.js` },
  });
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  await db.open({ query: { castBigIntToDouble: true, castDecimalToDouble: true } });
  const conn = await db.connect();
  // Extensions (Parquet) are served from our own site (see scripts/copy-duckdb.mjs).
  const version = (await conn.query("SELECT library_version AS v FROM pragma_version()")).getChildAt(0)?.get(0);
  if (version !== extensions.version) {
    console.warn(`DuckDB ${String(version)} != ${extensions.version} in duckdb-extensions.json; using the official extension site`);
  } else {
    await conn.query(`SET custom_extension_repository = '${base}/extensions'`);
  }
  await conn.query("LOAD parquet");
  return { db, conn };
}

export function getDuckDB() {
  if (!dbPromise) {
    dbPromise = init().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/** Downloads a dataset (via a short-lived signed URL from our server) and exposes it as a table. */
export async function loadDataset(ds: { id: string; table_name: string }): Promise<void> {
  if (loadedTables.get(ds.table_name) === ds.id) return;
  const res = await fetch(`/api/datasets/${ds.id}/url`, { method: "POST" });
  if (!res.ok) throw new Error("dataset_url_failed");
  const { url } = (await res.json()) as { url: string };
  const file = await fetch(url);
  if (!file.ok) throw new Error("dataset_download_failed");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { db, conn } = await getDuckDB();
  const fileName = `${ds.table_name}.parquet`;
  await db.registerFileBuffer(fileName, bytes);
  await conn.query(`CREATE OR REPLACE TABLE "${ds.table_name}" AS SELECT * FROM read_parquet('${fileName}')`);
  loadedTables.set(ds.table_name, ds.id);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Arrow values -> plain JSON values (dates as "YYYY-MM-DD", timestamps as "YYYY-MM-DD HH:MM:SS").
function toCell(value: unknown, typeId: number): Cell {
  if (value === null || value === undefined) return null;
  // Arrow Type ids: Date = 8, Timestamp = 10.
  if ((typeId === 8 || typeId === 10) && (typeof value === "number" || value instanceof Date)) {
    const d = value instanceof Date ? value : new Date(value);
    const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    if (typeId === 8) return date;
    return `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  }
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export type QueryOutput = ResultSet & { totalRows: number; ms: number };

/** Runs SQL and returns at most MAX_RESULT_ROWS rows. Throws with DuckDB's error message. */
export async function runQuery(sql: string): Promise<QueryOutput> {
  const { conn } = await getDuckDB();
  const started = performance.now();
  const table = await conn.query(sql);
  const fields = table.schema.fields;
  const columns = fields.map((f) => f.name);
  const types = fields.map((f) => f.type.typeId as number);
  const rows: Cell[][] = [];
  const limit = Math.min(table.numRows, MAX_RESULT_ROWS);
  const vectors = fields.map((_, i) => table.getChildAt(i));
  for (let r = 0; r < limit; r++) {
    rows.push(vectors.map((v, c) => toCell(v?.get(r), types[c] ?? 0)));
  }
  return { columns, rows, totalRows: table.numRows, ms: Math.round(performance.now() - started) };
}

/** Admin helper: read a CSV file, return preview + columns and the Parquet bytes to upload. */
export async function csvToParquet(file: File) {
  const { db, conn } = await getDuckDB();
  const csvName = `upload_${Date.now()}.csv`;
  const outName = `upload_${Date.now()}.parquet`;
  await db.registerFileBuffer(csvName, new Uint8Array(await file.arrayBuffer()));
  await conn.query(`CREATE OR REPLACE TABLE __upload AS SELECT * FROM read_csv_auto('${csvName}', sample_size = -1)`);
  const info = await runQuery(`SELECT column_name AS name, column_type AS type FROM (DESCRIBE __upload)`);
  const columns = info.rows.map((r) => ({ name: String(r[0]), type: String(r[1]) }));
  const count = await runQuery(`SELECT COUNT(*) AS n FROM __upload`);
  const preview = await runQuery(`SELECT * FROM __upload LIMIT 20`);
  await conn.query(`COPY __upload TO '${outName}' (FORMAT PARQUET)`);
  const parquet = await db.copyFileToBuffer(outName);
  await db.dropFile(csvName);
  await db.dropFile(outName);
  return { columns, rowCount: Number(count.rows[0]?.[0] ?? 0), preview: preview.rows, parquet };
}
