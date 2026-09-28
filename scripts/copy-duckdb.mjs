// Prepares the in-browser SQL engine (DuckDB-WASM) in public/duckdb, so the SQL editor loads
// everything from our own site (no CDN at runtime; same on Netlify and on a VPS):
//  1. copies the engine files from node_modules,
//  2. downloads the Parquet extension once from extensions.duckdb.org (skipped if present).
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const src = join("node_modules", "@duckdb", "duckdb-wasm", "dist");
const dest = join("public", "duckdb");
const files = ["duckdb-mvp.wasm", "duckdb-eh.wasm", "duckdb-browser-mvp.worker.js", "duckdb-browser-eh.worker.js"];

mkdirSync(dest, { recursive: true });
for (const f of files) {
  const from = join(src, f);
  const to = join(dest, f);
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  copyFileSync(from, to);
}

const cfg = JSON.parse(readFileSync(join("src", "lib", "practice", "duckdb-extensions.json"), "utf8"));
for (const platform of ["wasm_eh", "wasm_mvp"]) {
  for (const ext of cfg.extensions) {
    const rel = join(cfg.version, platform, `${ext}.duckdb_extension.wasm`);
    const to = join(dest, "extensions", rel);
    if (existsSync(to) && statSync(to).size > 0) continue;
    const url = `https://extensions.duckdb.org/${cfg.version}/${platform}/${ext}.duckdb_extension.wasm`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, Buffer.from(await res.arrayBuffer()));
  }
}
console.log(`DuckDB-WASM ready in public/duckdb (extensions ${cfg.version}: ${cfg.extensions.join(", ")})`);
