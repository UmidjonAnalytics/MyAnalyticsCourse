"""Generates the sample "messy" retail datasets (Tashkent store chain, 2025) as Parquet files.

Usage:  pip install duckdb && python scripts/generate_sample_datasets.py OUT_DIR
Upload the files through the admin panel (Datasetlar) or let Claude upload them.

The data is realistic on purpose: inconsistent spelling/casing, extra spaces, missing values,
duplicate rows, returns (negative quantity) and a sale that points to a store that does not exist.
"""

import random
import sys
from datetime import date, timedelta
from pathlib import Path

import duckdb

random.seed(2025)
out = Path(sys.argv[1] if len(sys.argv) > 1 else "sample-datasets")
out.mkdir(parents=True, exist_ok=True)

districts = ["Chilonzor", "Yunusobod", "Mirzo Ulug'bek", "Yakkasaroy", "Sergeli", "Olmazor", "Shayxontohur", "Uchtepa"]
messy = {  # the same district typed differently by different store managers
    "Chilonzor": ["Chilonzor", "chilonzor", "Chilonzor "],
    "Yunusobod": ["Yunusobod", "YUNUSOBOD"],
    "Mirzo Ulug'bek": ["Mirzo Ulug'bek", "M. Ulug'bek"],
}
managers = ["Aziz Karimov", "Dilnoza Rahimova", "Jasur Toshmatov", "Malika Yusupova", "Otabek Nazarov",
            "Nilufar Qodirova", "Sardor Aliyev", "Gulnora Ismoilova", "Bekzod Umarov", "Kamola Saidova", None, None]

stores = []
for i in range(1, 13):
    d = districts[(i - 1) % len(districts)]
    stores.append((
        i,
        f"Baraka Market #{i}",
        random.choice(messy.get(d, [d])),
        "Toshkent",
        date(2019, 1, 1) + timedelta(days=random.randint(0, 1800)),
        managers[i - 1],
    ))

catalog = {
    "Ichimliklar": [("Coca-Cola 1.5L", 14000), ("Nestle suv 1.5L", 5000), ("Choy Ahmad 100g", 32000), ("Sharbat Bonaqua 1L", 12000), ("Kofe Nescafe 95g", 45000)],
    "Sut mahsulotlari": [("Sut 1L", 11000), ("Qatiq 0.5L", 7000), ("Pishloq 200g", 38000), ("Sariyog' 180g", 29000), ("Tvorog 400g", 24000)],
    "Non va shirinliklar": [("Non (patir)", 5000), ("Tort Napoleon", 95000), ("Pechenye 300g", 18000), ("Shokolad Alpen Gold", 16000)],
    "Go'sht": [("Mol go'shti 1kg", 115000), ("Tovuq 1kg", 42000), ("Qo'y go'shti 1kg", 125000), ("Kolbasa 500g", 55000)],
    "Meva-sabzavot": [("Olma 1kg", 16000), ("Kartoshka 1kg", 6000), ("Piyoz 1kg", 5000), ("Pomidor 1kg", 18000), ("Banan 1kg", 22000)],
    "Maishiy kimyo": [("Ariel 3kg", 98000), ("Fairy 500ml", 21000), ("Sovun Dove", 14000), ("Shampun Head&Shoulders", 52000)],
}
cat_spelling = {"Ichimliklar": ["Ichimliklar", "ichimliklar"], "Go'sht": ["Go'sht", "Gosht"]}

products = []
pid = 100
for cat, items in catalog.items():
    for name, price in items:
        pid += 1
        products.append((pid, name, random.choice(cat_spelling.get(cat, [cat])), price if random.random() > 0.05 else None))
list_price = {}
for p in products:
    base = next(pr for items in catalog.values() for (n, pr) in items if n == p[1])
    list_price[p[0]] = base

payments = ["Naqd", "naqd", "Karta", "Humo", "UzCard", "Click", "Payme"]
sales = []
sid = 0
start = date(2025, 1, 1)
for day in range(365):
    d = start + timedelta(days=day)
    weekend = d.weekday() >= 5
    for store in stores:
        for _ in range(random.randint(8, 18) + (6 if weekend else 0)):
            sid += 1
            p = random.choice(products)
            qty = random.choice([1, 1, 1, 2, 2, 3, 4, 5])
            if random.random() < 0.01:
                qty = -qty  # return
            if random.random() < 0.005:
                qty = None  # cashier forgot
            price = list_price[p[0]] * (1.1 if d.month >= 7 else 1.0)  # price rise in July
            discount = random.choice([0, 0, 0, 0, 0.05, 0.1])
            store_id = store[0] if random.random() > 0.0005 else 99  # unknown store
            sales.append((sid, d, store_id, p[0], qty, round(price), discount, random.choice(payments)))

# ~0.5% exact duplicate rows (double-scanned receipts)
dups = random.sample(sales, len(sales) // 200)
sales.extend(dups)
random.shuffle(sales)

con = duckdb.connect()
con.execute("create table stores (store_id integer, store_name varchar, district varchar, city varchar, opened_date date, manager varchar)")
con.executemany("insert into stores values (?, ?, ?, ?, ?, ?)", stores)
con.execute("create table products (product_id integer, product_name varchar, category varchar, unit_price integer)")
con.executemany("insert into products values (?, ?, ?, ?)", products)
con.execute("create table sales (sale_id integer, sale_date date, store_id integer, product_id integer, quantity integer, unit_price integer, discount double, payment_method varchar)")
con.executemany("insert into sales values (?, ?, ?, ?, ?, ?, ?, ?)", sales)
for t in ["stores", "products", "sales"]:
    con.execute(f"copy {t} to '{out / (t + '.parquet')}' (format parquet)")
    print(t, con.execute(f"select count(*) from {t}").fetchone()[0], "rows ->", out / (t + ".parquet"))
