"""Seeds Phase 4 practice content: the sample retail datasets + a demo SQL course with exercises.

Usage:
  pip install duckdb
  python scripts/generate_sample_datasets.py sample-datasets
  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SECRET_KEY=sb_secret_... \
    python scripts/seed_practice.py sample-datasets

Safe to run again: existing datasets/course (matched by table name / slug) are reused and the
exercise answer keys are recomputed. Answer keys are computed here with DuckDB, the same engine
students use in the browser.
"""

import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from datetime import date
from pathlib import Path

import duckdb

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SECRET_KEY"]
DATA = Path(sys.argv[1] if len(sys.argv) > 1 else "sample-datasets")
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}


def http(method, path, body=None, headers=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    h = {**H, "content-type": "application/json", **(headers or {})}
    req = urllib.request.Request(URL + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            text = r.read().decode()
            return json.loads(text) if text else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} failed: {e.code} {e.read().decode()[:300]}")


def rest(method, table, body=None, query=""):
    return http(method, f"/rest/v1/{table}{query}", body, {"Prefer": "return=representation,resolution=merge-duplicates"})


def one(table, query):
    rows = http("GET", f"/rest/v1/{table}?{query}&limit=1")
    return rows[0] if rows else None


def jsonable(v):
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v


con = duckdb.connect()
DATASETS = {
    "stores": ("Do'konlar", "Baraka Market do'konlar tarmog'i: 12 ta do'kon, tuman va menejer."),
    "products": ("Mahsulotlar", "27 ta mahsulot: nomi, kategoriya va narx."),
    "sales": ("Sotuvlar (2025)", "2025-yil sotuvlari: sana, do'kon, mahsulot, soni, narx, chegirma, to'lov usuli."),
}

# ---------------------------------------------------------------- datasets
ds_ids = {}
for table, (name, desc) in DATASETS.items():
    path = DATA / f"{table}.parquet"
    con.execute(f"create or replace table {table} as select * from read_parquet('{path}')")
    existing = one("datasets", f"table_name=eq.{table}&select=id")
    if existing:
        ds_ids[table] = existing["id"]
        print("dataset exists:", table)
        continue
    storage_path = f"v1/{uuid.uuid4()}.parquet"
    http("POST", f"/storage/v1/object/datasets/{storage_path}", raw=path.read_bytes(),
         headers={"content-type": "application/octet-stream", "x-upsert": "true"})
    cols = [{"name": r[0], "type": r[1]} for r in con.execute(f"describe {table}").fetchall()]
    preview = [[jsonable(v) for v in row] for row in con.execute(f"select * from {table} limit 20").fetchall()]
    count = con.execute(f"select count(*) from {table}").fetchone()[0]
    row = rest("POST", "datasets", {"name": name, "table_name": table, "description": desc, "storage_path": storage_path,
                                    "columns": cols, "row_count": count, "preview": preview})[0]
    ds_ids[table] = row["id"]
    print("dataset uploaded:", table, count, "rows")

# ---------------------------------------------------------------- course
cat = one("categories", "slug=eq.sql&select=id")
course = one("courses", "slug=eq.sql-savdo-tahlili&select=id")
if not course:
    course = rest("POST", "courses", {
        "category_id": cat["id"] if cat else None,
        "title": "SQL: savdo tahlili",
        "slug": "sql-savdo-tahlili",
        "short_description": "Real, \"iflos\" savdo ma'lumotlarida SELECT, filtrlash, guruhlash va JOIN.",
        "description": "Toshkentdagi **Baraka Market** do'konlar tarmog'ining 2025-yilgi sotuvlari bilan ishlaysiz.\n\n"
                       "- 64 mingdan ortiq sotuv yozuvi\n- takroriy cheklar, qaytarilgan tovarlar va bo'sh qiymatlar\n"
                       "- har bir darsda brauzerning o'zida SQL yozib, natijani avtomatik tekshirasiz",
        "price": 890000, "is_published": True, "position": 4,
    })[0]
course_id = course["id"]

MODULES = [
    ("1-modul: Ma'lumot bilan tanishuv", [
        ("Jadvallar bilan tanishuv", "jadvallar-bilan-tanishuv", True),
        ("To'lov usullarini tozalash", "tolov-usullarini-tozalash", False),
    ]),
    ("2-modul: Guruhlash va JOIN", [
        ("Do'konlar bo'yicha tushum", "dokonlar-boyicha-tushum", False),
        ("Oylik dinamika", "oylik-dinamika", False),
    ]),
]

CONTENT = {
    "jadvallar-bilan-tanishuv": (
        "## Jadvallar\n\nKurs davomida uchta jadval bilan ishlaymiz:\n\n"
        "| Jadval | Nima saqlanadi |\n|---|---|\n| `sales` | har bir sotuv (chek qatori) |\n| `stores` | do'konlar |\n| `products` | mahsulotlar |\n\n"
        "Eng oddiy so'rov jadvaldagi qatorlarni ko'rsatadi:\n\n```sql\nSELECT *\nFROM sales\nLIMIT 10;\n```\n\n"
        "Qatorlar sonini `COUNT(*)` bilan sanaymiz. Ustunga tushunarli nom berish uchun `AS` ishlatiladi.",
        "**Vaziyat:** moliya bo'limi 2025-yil uchun bazada nechta sotuv yozuvi borligini so'radi.\n\nJadval: `sales`.",
    ),
    "tolov-usullarini-tozalash": (
        "## Iflos matnlar\n\nKassirlar to'lov usulini turlicha yozgan: `Naqd` va `naqd` aslida bitta usul. "
        "Guruhlashdan oldin matnni bir xil ko'rinishga keltiramiz:\n\n```sql\nSELECT LOWER(TRIM(payment_method)) AS tolov_usuli\nFROM sales;\n```\n\n"
        "`TRIM` bo'sh joylarni, `LOWER` katta harflarni olib tashlaydi.",
        "**Vaziyat:** marketing bo'limi har bir to'lov usuli bo'yicha sotuvlar sonini bilmoqchi. "
        "Katta-kichik harf farqi bo'lmasin.\n\nJadval: `sales`.",
    ),
    "dokonlar-boyicha-tushum": (
        "## Toza tushum\n\nTushum = `quantity * unit_price * (1 - discount)`.\n\nHisoblashdan oldin ma'lumotni tozalang:\n\n"
        "- **takroriy qatorlar** (bir chek ikki marta skanerlangan) — `SELECT DISTINCT`\n"
        "- **qaytarilgan tovarlar** (manfiy `quantity`) va bo'sh `quantity` — `WHERE quantity > 0`\n"
        "- **mavjud bo'lmagan do'kon** (`store_id = 99`) — `JOIN stores` uni o'zi tashlab yuboradi\n\n"
        "```sql\nWITH toza AS (\n  SELECT DISTINCT * FROM sales WHERE quantity > 0\n)\nSELECT ...\nFROM toza\nJOIN stores USING (store_id)\nGROUP BY ...;\n```",
        "**Vaziyat:** rahbariyat har bir do'konning 2025-yilgi toza tushumini ko'rmoqchi, eng kattasi birinchi.\n\n"
        "Jadvallar: `sales`, `stores`. Natija: `dokon`, `tushum` (so'mda, butun songa yaxlitlangan).",
    ),
    "oylik-dinamika": (
        "## Sana bilan ishlash\n\nOylarni ajratish uchun `strftime(sale_date, '%Y-%m')` ishlatamiz: natija `2025-03` kabi matn bo'ladi.\n\n"
        "Iyul oyidan narxlar 10% oshgan — oylik grafikda buni ko'rasiz.",
        "**Vaziyat:** moliya direktori 2025-yil bo'yicha oyma-oy toza tushumni so'radi.\n\n"
        "Jadval: `sales`. Natija: `oy` (`2025-01` ko'rinishida), `tushum` (butun son), oy bo'yicha tartiblangan.",
    ),
}

CLEAN = "with toza as (select distinct * from sales where quantity > 0)"
EXERCISES = {
    "jadvallar-bilan-tanishuv": dict(
        title="Nechta sotuv yozuvi bor?",
        task="`sales` jadvalidagi barcha qatorlar sonini toping. Ustun nomi: `jami_sotuvlar`.",
        sql="select count(*) as jami_sotuvlar from sales",
        tables=["sales"], points=5,
        rules=[
            {"id": "cols", "type": "columns", "hint": "Ustunni AS jami_sotuvlar deb nomlang."},
            {"id": "rows", "type": "rows", "hint": "COUNT(*) barcha qatorlarni sanaydi. WHERE qo'shmang."},
        ]),
    "tolov-usullarini-tozalash": dict(
        title="To'lov usullari bo'yicha sotuvlar",
        task="Har bir to'lov usuli (kichik harflarda, bo'sh joylarsiz) uchun sotuvlar sonini chiqaring. "
             "Ustunlar: `tolov_usuli`, `soni`.",
        sql="select lower(trim(payment_method)) as tolov_usuli, count(*) as soni from sales group by 1 order by soni desc",
        tables=["sales"], points=10,
        rules=[
            {"id": "cols", "type": "columns", "hint": "Ikkita ustun kerak: tolov_usuli va soni."},
            {"id": "count", "type": "row_count", "hint": "'Naqd' va 'naqd' bitta usul. LOWER(TRIM(...)) ishlating."},
            {"id": "rows", "type": "rows", "hint": "GROUP BY tozalangan qiymat bo'yicha bo'lsin."},
        ]),
    "dokonlar-boyicha-tushum": dict(
        title="Har bir do'konning toza tushumi",
        task="Takroriy qatorlarsiz, faqat `quantity > 0` bo'lgan sotuvlardan har bir do'kon tushumini hisoblang. "
             "Ustunlar: `dokon` (do'kon nomi), `tushum` (ROUND bilan butun son). Eng katta tushum birinchi.",
        sql=f"{CLEAN} select st.store_name as dokon, round(sum(t.quantity * t.unit_price * (1 - t.discount))) as tushum "
            "from toza t join stores st using (store_id) group by st.store_name order by tushum desc",
        tables=["sales", "stores"], points=20,
        rules=[
            {"id": "cols", "type": "columns", "hint": "Ustunlar: dokon va tushum."},
            {"id": "count", "type": "row_count", "hint": "12 ta do'kon bo'lishi kerak. Mavjud bo'lmagan do'kon (99) JOIN bilan tushib qoladi."},
            {"id": "rows", "type": "rows", "ordered": True, "tolerance": 1,
             "hint": "Takroriy qatorlarni (DISTINCT) va qaytarilgan tovarlarni (quantity > 0) olib tashlaganingizni, tushumni kamayish tartibida saralaganingizni tekshiring."},
            {"id": "sum", "type": "column_sum", "column": "tushum", "tolerance": 100,
             "hint": "Jami tushum mos kelmadi: chegirmani (1 - discount) hisobga oldingizmi?"},
        ]),
    "oylik-dinamika": dict(
        title="Oyma-oy tushum",
        task="Toza ma'lumotdan 2025-yilning har bir oyi uchun tushumni chiqaring. Ustunlar: `oy` (`2025-01`), `tushum` (butun son). Oy bo'yicha o'sish tartibida.",
        sql=f"{CLEAN} select strftime(sale_date, '%Y-%m') as oy, round(sum(quantity * unit_price * (1 - discount))) as tushum "
            "from toza group by 1 order by 1",
        tables=["sales"], points=20,
        rules=[
            {"id": "cols", "type": "columns", "hint": "Ustunlar: oy va tushum."},
            {"id": "count", "type": "row_count", "hint": "12 oy bo'lishi kerak."},
            {"id": "rows", "type": "rows", "ordered": True, "tolerance": 1,
             "hint": "strftime(sale_date, '%Y-%m') va ORDER BY oy ishlating; toza ma'lumotdan hisoblang."},
        ]),
}

for m_pos, (m_title, lessons) in enumerate(MODULES, start=1):
    mod = one("modules", f"course_id=eq.{course_id}&title=eq.{urllib.request.quote(m_title)}&select=id")
    if not mod:
        mod = rest("POST", "modules", {"course_id": course_id, "title": m_title, "position": m_pos})[0]
    for l_pos, (l_title, slug, free) in enumerate(lessons, start=1):
        les = one("lessons", f"course_id=eq.{course_id}&slug=eq.{slug}&select=id")
        if not les:
            les = rest("POST", "lessons", {"module_id": mod["id"], "course_id": course_id, "title": l_title, "slug": slug,
                                           "position": l_pos, "is_free_preview": free, "is_published": True})[0]
        content, task = CONTENT[slug]
        rest("POST", "lesson_contents", {"lesson_id": les["id"], "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                                         "content_md": content, "task_md": task}, "?on_conflict=lesson_id")
        ex = EXERCISES[slug]
        exr = one("exercises", f"lesson_id=eq.{les['id']}&select=id")
        if not exr:
            exr = rest("POST", "exercises", {"lesson_id": les["id"], "title": ex["title"], "task_md": ex["task"],
                                             "points": ex["points"], "position": 1, "is_published": True})[0]
        for tname in ex["tables"]:
            rest("POST", "exercise_datasets", {"exercise_id": exr["id"], "dataset_id": ds_ids[tname]}, "?on_conflict=exercise_id,dataset_id")
        res = con.execute(ex["sql"])
        cols = [d[0] for d in res.description]
        rows = [[jsonable(v) for v in r] for r in res.fetchall()]
        rest("POST", "exercise_keys", {"exercise_id": exr["id"], "reference_sql": ex["sql"], "expected": {"columns": cols, "rows": rows},
                                       "check_rules": ex["rules"]}, "?on_conflict=exercise_id")
        print(f"lesson {slug}: exercise '{ex['title']}' -> {len(rows)} expected rows")

print("done. Course: /kurs/sql-savdo-tahlili")
