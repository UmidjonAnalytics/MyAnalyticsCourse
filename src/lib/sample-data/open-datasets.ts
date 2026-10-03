import "server-only";

// Sample datasets for the free data library ("Namuna kontent" button in admin).
// All data is invented (synthetic) and generated deterministically from a fixed seed, so every
// install produces exactly the same files. Values have realistic relationships so the questions in
// each description have real answers. The retail set contains deliberate "dirty data" for cleaning practice.

type Cell = string | number | null;
export type SampleDataset = {
  slug: string;
  title: string;
  short_description: string;
  description_md: string;
  industry: string;
  tags: string[];
  columns: { name: string; description: string }[];
  rows: Cell[][];
};

/** Small, fast, seedable PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)]!;
  /** Weighted pick: [[value, weight], ...] */
  const weighted = <T,>(xs: readonly (readonly [T, number])[]) => {
    const total = xs.reduce((a, [, w]) => a + w, 0);
    let r = next() * total;
    for (const [v, w] of xs) if ((r -= w) <= 0) return v;
    return xs[xs.length - 1]![0];
  };
  /** Roughly normal (sum of uniforms). */
  const normal = (mean: number, sd: number) => mean + sd * ((next() + next() + next() + next() + next() + next() - 3) / 0.7071);
  return { next, int, pick, weighted, normal };
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (start: string, days: number) => new Date(Date.parse(`${start}T00:00:00Z`) + days * 86_400_000);
const round = (x: number, step: number) => Math.max(step, Math.round(x / step) * step);

const VILOYATLAR = [
  ["Toshkent sh.", 30], ["Toshkent vil.", 9], ["Samarqand", 10], ["Farg'ona", 9], ["Andijon", 8], ["Namangan", 7],
  ["Buxoro", 6], ["Qashqadaryo", 6], ["Surxondaryo", 4], ["Xorazm", 4], ["Navoiy", 3], ["Jizzax", 2], ["Sirdaryo", 1], ["Qoraqalpog'iston", 3],
] as const;

// ------------------------------------------------------------------ 1. retail receipts (with dirty data)

function retail(): SampleDataset {
  const r = rng(20251);
  const filiallar = [["Chilonzor", 1.3], ["Yunusobod", 1.2], ["Mirzo Ulug'bek", 1.0], ["Sergeli", 0.8], ["Yakkasaroy", 0.7]] as const;
  const products: Record<string, [string, number][]> = {
    "Non mahsulotlari": [["Non (oq)", 4000], ["Patir non", 6000], ["Lavash", 5000], ["Bulochka", 3000]],
    "Sut mahsulotlari": [["Sut 1 l", 12000], ["Qatiq 0,5 l", 8000], ["Pishloq 200 g", 28000], ["Sariyog' 200 g", 32000]],
    "Ichimliklar": [["Choy (qora) 100 g", 15000], ["Mineral suv 1,5 l", 5000], ["Sharbat 1 l", 16000], ["Gazli ichimlik 1,5 l", 13000]],
    "Oziq-ovqat": [["Guruch 1 kg", 21000], ["Un 2 kg", 18000], ["O'simlik yog'i 1 l", 24000], ["Shakar 1 kg", 14000], ["Makaron 400 g", 9000]],
    "Maishiy kimyo": [["Kir yuvish kukuni 3 kg", 68000], ["Idish yuvish vositasi", 17000], ["Sovun", 6000], ["Tish pastasi", 19000]],
  };
  const cats = Object.keys(products);
  const pay = [["Naqd", 30], ["Uzcard", 25], ["Humo", 20], ["Click", 15], ["Payme", 10]] as const;
  const rows: Cell[][] = [];
  let id = 100000;
  for (let day = 0; day < 365; day++) {
    const date = addDays("2025-01-01", day);
    const month = date.getUTCMonth() + 1;
    const weekend = [0, 6].includes(date.getUTCDay());
    // Ramazon (March) and New Year (December) peaks; Sergeli drops from August (a competitor opened).
    const season = (month === 3 ? 1.25 : 1) * (month === 12 ? 1.35 : 1) * (weekend ? 1.2 : 1);
    for (const [filial, size] of filiallar) {
      const drop = filial === "Sergeli" && month >= 8 ? 0.65 : 1;
      const receipts = Math.round(8 * size * season * drop * (0.8 + r.next() * 0.4));
      for (let i = 0; i < receipts; i++) {
        id++;
        const lines = r.int(1, 3);
        const hour = r.weighted([[9, 1], [10, 1], [12, 1.5], [13, 1.5], [17, 2], [18, 2.5], [19, 2], [20, 1.2], [21, 0.6]] as const);
        const card = r.next() < 0.35 ? "Sodiqlik kartasi" : "Oddiy";
        const p = r.weighted(pay);
        for (let k = 0; k < lines; k++) {
          const cat = r.pick(cats);
          const [name, price] = r.pick(products[cat]!);
          const qty = cat === "Non mahsulotlari" ? r.int(1, 4) : r.int(1, 3);
          const discount = card === "Sodiqlik kartasi" ? r.pick([0, 0, 5, 10]) : 0;
          rows.push([id, isoDate(date), `${pad(hour)}:${pad(r.int(0, 59))}`, filial, cat, name, qty, price, discount, p, card]);
        }
      }
    }
  }
  // Deliberate dirty data: spelling variants, missing payment types, duplicates, returns, a typo price.
  for (const row of rows) {
    const x = r.next();
    if (row[3] === "Chilonzor" && x < 0.04) row[3] = "chilonzor";
    else if (row[3] === "Mirzo Ulug'bek" && x < 0.05) row[3] = "M. Ulug'bek";
    else if (x > 0.985) row[9] = null;
  }
  for (let i = 0; i < 40; i++) rows.splice(r.int(0, rows.length - 1), 0, [...rows[r.int(0, rows.length - 1)]!]);
  for (let i = 0; i < 25; i++) {
    const row = [...rows[r.int(0, rows.length - 1)]!];
    row[6] = -Number(row[6]);
    rows.push(row);
  }
  rows[r.int(0, rows.length - 1)]![7] = 1200000; // someone typed an extra zero... or two
  rows.sort((a, b) => Number(a[0]) - Number(b[0]));

  return {
    slug: "megamart-chakana-savdo-2025",
    title: "MegaMart: chakana savdo cheklari (2025)",
    short_description: "Toshkentdagi 5 ta filialning bir yillik savdo cheklari. Tozalash uchun ataylab xatolar qo'shilgan.",
    industry: "Chakana savdo",
    tags: ["Excel", "Power BI", "SQL", "Ma'lumot tozalash"],
    description_md: `**MegaMart** — o'ylab topilgan oziq-ovqat do'konlari tarmog'i. Har bir qator — chekdagi bitta mahsulot.

> Ma'lumotlar sintetik (sun'iy yaratilgan), real kompaniyaga tegishli emas.

**Ataylab qo'shilgan "iflos" ma'lumotlar** (real ishdagidek):
- filial nomlari turlicha yozilgan (\`chilonzor\`, \`M. Ulug'bek\`);
- ba'zi to'lov turlari bo'sh;
- takrorlangan qatorlar;
- qaytarishlar (manfiy miqdor);
- bitta xato kiritilgan narx.

**O'rganish uchun savollar**
1. Qaysi filial eng ko'p tushum keltiradi? Oylar bo'yicha qanday o'zgaradi?
2. Qaysi filialda yil ichida keskin pasayish bo'lgan va qachondan?
3. Mart va dekabr oylarida savdo nega oshgan bo'lishi mumkin?
4. Sodiqlik kartasi egalari o'rtacha chekda ko'proq sarflaydimi?
5. Kunning qaysi soatlarida xodim ko'proq kerak?`,
    columns: [
      { name: "chek_id", description: "Chek raqami (bir chekda bir nechta qator bo'lishi mumkin)" },
      { name: "sana", description: "Xarid sanasi (YYYY-MM-DD)" },
      { name: "vaqt", description: "Xarid vaqti (SS:DD)" },
      { name: "filial", description: "Filial (tuman) nomi" },
      { name: "kategoriya", description: "Mahsulot toifasi" },
      { name: "mahsulot", description: "Mahsulot nomi" },
      { name: "miqdor", description: "Dona soni; manfiy — qaytarish" },
      { name: "narx_som", description: "Bir dona narxi, so'm" },
      { name: "chegirma_foiz", description: "Chegirma, %" },
      { name: "tolov_turi", description: "To'lov usuli: Naqd, Uzcard, Humo, Click, Payme" },
      { name: "mijoz_turi", description: "Oddiy yoki Sodiqlik kartasi egasi" },
    ],
    rows,
  };
}

// ------------------------------------------------------------------ 2. bank loan applications

function bank(): SampleDataset {
  const r = rng(20252);
  const types = [["Iste'mol", 45], ["Mikroqarz", 25], ["Avto", 20], ["Ipoteka", 10]] as const;
  const rows: Cell[][] = [];
  for (let i = 1; i <= 8000; i++) {
    const age = Math.min(65, Math.max(21, Math.round(r.normal(36, 9))));
    const income = round(Math.max(2_500_000, r.normal(7_500_000, 3_500_000) * (age > 30 ? 1.15 : 0.9)), 100_000);
    const type = r.weighted(types);
    const [minA, maxA, term] =
      type === "Ipoteka" ? [150_000_000, 600_000_000, r.pick([120, 180, 240])] :
      type === "Avto" ? [80_000_000, 250_000_000, r.pick([24, 36, 48, 60])] :
      type === "Mikroqarz" ? [2_000_000, 30_000_000, r.pick([6, 12, 18])] :
      [10_000_000, 80_000_000, r.pick([12, 24, 36])];
    const amount = round(minA + r.next() * (maxA - minA), 1_000_000);
    const history = r.weighted([["Yaxshi", 45], ["O'rtacha", 25], ["Yomon", 12], ["Yo'q", 18]] as const);
    const burden = amount / term / income; // monthly payment share (no interest, rough)
    const score = (history === "Yaxshi" ? 0.35 : history === "O'rtacha" ? 0.15 : history === "Yo'q" ? 0.05 : -0.4) - burden * 0.9 + (age >= 25 && age <= 55 ? 0.1 : -0.05);
    const approved = r.next() < 0.45 + score;
    const defaultProb = Math.min(0.6, Math.max(0.01, 0.04 + burden * 0.25 + (history === "Yomon" ? 0.15 : history === "Yo'q" ? 0.06 : 0)));
    const date = addDays("2024-01-01", r.int(0, 729));
    rows.push([
      100000 + i,
      isoDate(date),
      r.weighted(VILOYATLAR),
      age,
      r.weighted([["Erkak", 58], ["Ayol", 42]] as const),
      income,
      type,
      amount,
      term,
      history,
      approved ? "Tasdiqlandi" : "Rad etildi",
      approved ? (r.next() < defaultProb ? 1 : 0) : null,
    ]);
  }
  return {
    slug: "bank-kredit-arizalari",
    title: "Bank: kredit arizalari (2024–2025)",
    short_description: "8 000 ta kredit arizasi: mijoz, kredit turi, bank qarori va 90 kunlik kechikishlar.",
    industry: "Bank va moliya",
    tags: ["Excel", "SQL", "Python", "Risk tahlili"],
    description_md: `O'ylab topilgan bankning ikki yillik kredit arizalari. Tasdiqlangan kreditlar uchun mijoz 90 kundan ortiq kechikkanmi — shu ham berilgan.

> Ma'lumotlar sintetik (sun'iy yaratilgan), real bank yoki shaxslarga tegishli emas.

**O'rganish uchun savollar**
1. Arizalarning necha foizi tasdiqlanadi? Kredit turi va viloyat bo'yicha farq bormi?
2. Kredit tarixi qarorga qanchalik ta'sir qiladi?
3. Oylik to'lov / daromad nisbati oshgani sari kechikish ehtimoli qanday o'zgaradi?
4. Qaysi mijozlar guruhi eng xavfli? Bank qaysi arizalarni rad etishi kerak edi?`,
    columns: [
      { name: "ariza_id", description: "Ariza raqami" },
      { name: "sana", description: "Ariza topshirilgan sana" },
      { name: "viloyat", description: "Mijoz yashaydigan hudud" },
      { name: "yosh", description: "Mijoz yoshi" },
      { name: "jins", description: "Erkak / Ayol" },
      { name: "oylik_daromad_som", description: "Rasmiy oylik daromad, so'm" },
      { name: "kredit_turi", description: "Iste'mol, Mikroqarz, Avto, Ipoteka" },
      { name: "summa_som", description: "So'ralgan summa, so'm" },
      { name: "muddat_oy", description: "Kredit muddati, oy" },
      { name: "kredit_tarixi", description: "Yaxshi, O'rtacha, Yomon yoki Yo'q (birinchi kredit)" },
      { name: "qaror", description: "Tasdiqlandi / Rad etildi" },
      { name: "kechikish_90_kun", description: "1 — 90 kundan ortiq kechikkan, 0 — yo'q; rad etilganlarda bo'sh" },
    ],
    rows,
  };
}

// ------------------------------------------------------------------ 3. mobile operator churn

function telecom(): SampleDataset {
  const r = rng(20253);
  const tariffs = [["Start", 35_000], ["Oddiy", 55_000], ["Faol", 85_000], ["Premium", 140_000]] as const;
  const rows: Cell[][] = [];
  for (let i = 1; i <= 7000; i++) {
    const [tariff, fee] = r.weighted(tariffs.map((t, k) => [t, [30, 35, 25, 10][k]!] as const));
    const tenure = Math.max(1, Math.round(Math.abs(r.normal(22, 18))));
    const gb = Math.max(0.5, Math.round(r.normal(tariff === "Premium" ? 40 : tariff === "Faol" ? 22 : tariff === "Oddiy" ? 12 : 5, 5) * 10) / 10);
    const minutes = Math.max(0, Math.round(r.normal(380, 160)));
    const complaints = r.weighted([[0, 55], [1, 25], [2, 12], [3, 5], [4, 3]] as const);
    const extra = Math.max(0, Math.round(r.normal(gb > 30 ? 25_000 : 6_000, 5_000) / 1000) * 1000);
    const p = 0.08 + complaints * 0.09 + (tenure < 6 ? 0.12 : 0) + (tariff === "Start" ? 0.05 : 0) - (tenure > 36 ? 0.05 : 0);
    rows.push([
      `AB${String(i).padStart(5, "0")}`,
      r.weighted(VILOYATLAR),
      tariff,
      tenure,
      fee + extra,
      gb,
      minutes,
      complaints,
      r.weighted([["Ilova", 55], ["USSD", 20], ["Ofis", 25]] as const),
      r.next() < Math.min(0.85, p) ? "Ha" : "Yo'q",
    ]);
  }
  return {
    slug: "mobil-operator-abonentlar",
    title: "Mobil operator: abonentlar va ketish (churn)",
    short_description: "7 000 ta abonent: tarif, sarf, murojaatlar va operatordan ketgan-ketmagani.",
    industry: "Telekommunikatsiya",
    tags: ["Excel", "Power BI", "Python", "Churn"],
    description_md: `O'ylab topilgan mobil operatorning abonentlari (oxirgi 3 oy holati). **ketgan = Ha** — abonent boshqa operatorga o'tgan.

> Ma'lumotlar sintetik (sun'iy yaratilgan), real operator yoki abonentlarga tegishli emas.

**O'rganish uchun savollar**
1. Umumiy churn (ketish) darajasi qancha? Tariflar bo'yicha-chi?
2. Murojaatlar (shikoyatlar) soni ketishga qanday ta'sir qiladi?
3. Yangi abonentlar (6 oydan kam) ko'proq ketadimi?
4. Qaysi abonentlarni ushlab qolish uchun chegirma taklif qilish kerak? Ro'yxat tuzing.`,
    columns: [
      { name: "abonent_id", description: "Abonent raqami" },
      { name: "viloyat", description: "Hudud" },
      { name: "tarif", description: "Start, Oddiy, Faol, Premium" },
      { name: "ulangan_oy", description: "Necha oydan beri abonent" },
      { name: "oylik_tolov_som", description: "O'rtacha oylik to'lov (tarif + qo'shimcha xizmatlar), so'm" },
      { name: "internet_gb", description: "Oylik internet sarfi, GB" },
      { name: "qongiroq_daqiqa", description: "Oylik qo'ng'iroqlar, daqiqa" },
      { name: "murojaatlar_soni", description: "Oxirgi 3 oydagi shikoyat/murojaatlar" },
      { name: "asosiy_kanal", description: "Xizmatlarni qayerdan boshqaradi: Ilova, USSD, Ofis" },
      { name: "ketgan", description: "Ha — operatordan ketgan, Yo'q — qolgan" },
    ],
    rows,
  };
}

// ------------------------------------------------------------------ 4. online shop orders

function ecommerce(): SampleDataset {
  const r = rng(20254);
  const cats = [["Elektronika", 1_800_000, 15], ["Kiyim", 320_000, 30], ["Uy-ro'zg'or", 260_000, 25], ["Go'zallik", 150_000, 18], ["Bolalar uchun", 210_000, 12]] as const;
  const rows: Cell[][] = [];
  for (let i = 1; i <= 12000; i++) {
    const date = addDays("2025-01-01", r.int(0, 364));
    const month = date.getUTCMonth() + 1;
    const region = r.weighted(VILOYATLAR);
    const [cat, avg] = r.weighted(cats.map(([c, a, w]) => [[c, a] as const, w] as const));
    const sum = round(Math.max(30_000, r.normal(avg, avg * 0.45)), 1000);
    const far = ["Qoraqalpog'iston", "Xorazm", "Surxondaryo", "Navoiy"].includes(region);
    const days = region === "Toshkent sh." ? r.int(1, 2) : Math.max(1, Math.round(r.normal(far ? 6 : 3.5, 1.4) + (month === 11 ? 1.5 : 0)));
    const pReturn = 0.03 + (cat === "Kiyim" ? 0.07 : 0) + (days >= 6 ? 0.05 : 0);
    const status = r.next() < 0.04 ? "Bekor qilindi" : r.next() < pReturn ? "Qaytarildi" : "Yetkazildi";
    const rating = status !== "Yetkazildi" || r.next() < 0.45 ? null : Math.max(1, Math.min(5, Math.round(r.normal(days <= 2 ? 4.6 : days <= 4 ? 4.2 : 3.3, 0.8))));
    rows.push([
      `UZ-${200000 + i}`,
      isoDate(date),
      region,
      cat,
      sum,
      r.weighted([["Click", 30], ["Payme", 28], ["Karta (sayt)", 22], ["Naqd (kuryerga)", 20]] as const),
      status === "Bekor qilindi" ? null : days,
      status,
      rating,
    ]);
  }
  rows.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  return {
    slug: "onlayn-dokon-buyurtmalar",
    title: "Onlayn do'kon: buyurtmalar va yetkazib berish (2025)",
    short_description: "12 000 ta buyurtma: hudud, toifa, yetkazish muddati, qaytarishlar va mijoz bahosi.",
    industry: "Elektron tijorat",
    tags: ["Excel", "Power BI", "SQL", "Logistika"],
    description_md: `O'ylab topilgan butun O'zbekiston bo'ylab ishlaydigan onlayn do'konning bir yillik buyurtmalari.

> Ma'lumotlar sintetik (sun'iy yaratilgan), real kompaniyaga tegishli emas.

**O'rganish uchun savollar**
1. Qaysi viloyatlarga yetkazish eng uzoq davom etadi? Noyabrda nima o'zgaradi?
2. Yetkazish muddati mijoz bahosiga qanday ta'sir qiladi?
3. Qaysi toifada qaytarish ko'p va bu daromadga qancha zarar?
4. To'lov usullari bo'yicha bekor qilishlar farq qiladimi?`,
    columns: [
      { name: "buyurtma_id", description: "Buyurtma raqami" },
      { name: "sana", description: "Buyurtma sanasi" },
      { name: "viloyat", description: "Yetkazish hududi" },
      { name: "kategoriya", description: "Mahsulot toifasi" },
      { name: "summa_som", description: "Buyurtma summasi, so'm" },
      { name: "tolov_turi", description: "Click, Payme, Karta (sayt), Naqd (kuryerga)" },
      { name: "yetkazish_kun", description: "Necha kunda yetkazildi; bekor qilinganlarda bo'sh" },
      { name: "holat", description: "Yetkazildi, Qaytarildi, Bekor qilindi" },
      { name: "baho", description: "Mijoz bahosi 1–5; baho qoldirmaganlarda bo'sh" },
    ],
    rows,
  };
}

// ------------------------------------------------------------------ 5. HR / employees

function hr(): SampleDataset {
  const r = rng(20255);
  const deps = [
    ["Savdo", ["Savdo menejeri", "Katta savdo menejeri", "Bo'lim boshlig'i"], 6_500_000, 30],
    ["Moliya", ["Buxgalter", "Moliyaviy tahlilchi", "Bosh buxgalter"], 8_000_000, 12],
    ["IT", ["Dasturchi", "Ma'lumotlar tahlilchisi", "Jamoa rahbari"], 12_000_000, 15],
    ["Marketing", ["Marketolog", "SMM mutaxassisi", "Marketing rahbari"], 7_000_000, 10],
    ["Logistika", ["Ombor xodimi", "Logist", "Ombor mudiri"], 5_000_000, 20],
    ["HR", ["HR mutaxassisi", "Rekruter", "HR rahbari"], 6_500_000, 6],
    ["Mijozlar xizmati", ["Operator", "Katta operator", "Smena rahbari"], 4_500_000, 17],
  ] as const;
  const rows: Cell[][] = [];
  for (let i = 1; i <= 1200; i++) {
    const [dep, roles, base] = r.weighted(deps.map((d) => [d, d[3]] as const));
    const level = r.weighted([[0, 70], [1, 22], [2, 8]] as const);
    const tenure = Math.max(0, Math.round(Math.abs(r.normal(level * 3 + 2.5, 2.5)) * 10) / 10);
    const age = Math.max(20, Math.min(62, Math.round(22 + tenure + level * 4 + Math.abs(r.normal(4, 4)))));
    const gender = r.weighted([["Erkak", dep === "IT" || dep === "Logistika" ? 75 : 50], ["Ayol", dep === "HR" || dep === "Marketing" ? 60 : 45]] as const);
    // A deliberate pay gap to discover: women are paid ~8% less for the same role in Savdo and IT.
    const gap = gender === "Ayol" && (dep === "Savdo" || dep === "IT") ? 0.92 : 1;
    const salary = round(base * (1 + level * 0.6) * (1 + Math.min(tenure, 10) * 0.03) * gap * (0.9 + r.next() * 0.2), 50_000);
    const perf = Math.max(1, Math.min(5, Math.round(r.normal(3.5, 0.9))));
    const underpaid = salary < base * (1 + level * 0.6) * 1.02;
    const pLeft = 0.08 + (perf <= 2 ? 0.12 : 0) + (underpaid ? 0.08 : 0) + (dep === "Mijozlar xizmati" ? 0.12 : 0) - (tenure > 5 ? 0.05 : 0);
    rows.push([
      `X${String(i).padStart(4, "0")}`,
      dep,
      roles[level],
      gender,
      age,
      isoDate(addDays("2025-12-31", -Math.round(tenure * 365))),
      tenure,
      salary,
      perf,
      r.next() < pLeft ? "Ha" : "Yo'q",
    ]);
  }
  return {
    slug: "kompaniya-xodimlar-hr",
    title: "Kompaniya xodimlari (HR tahlili)",
    short_description: "1 200 ta xodim: bo'lim, lavozim, maosh, baho va kim ishdan ketgani.",
    industry: "HR",
    tags: ["Excel", "Power BI", "HR analitika"],
    description_md: `O'ylab topilgan savdo-xizmat kompaniyasining xodimlari (2025-yil oxiridagi holat). **ishdan_ketgan = Ha** — yil davomida ketgan.

> Ma'lumotlar sintetik (sun'iy yaratilgan), real kompaniya yoki shaxslarga tegishli emas.

**O'rganish uchun savollar**
1. Qaysi bo'limda xodimlar eng ko'p ketadi (turnover)?
2. Maosh, staj va baho ketishga qanday bog'liq?
3. Bir xil lavozimda erkak va ayollar maoshida farq bormi? Qaysi bo'limlarda?
4. HR rahbariga 3 ta aniq tavsiya bilan bir sahifalik dashboard tayyorlang.`,
    columns: [
      { name: "xodim_id", description: "Xodim raqami" },
      { name: "bolim", description: "Bo'lim" },
      { name: "lavozim", description: "Lavozim" },
      { name: "jins", description: "Erkak / Ayol" },
      { name: "yosh", description: "Yoshi" },
      { name: "ishga_kirgan_sana", description: "Ishga kirgan sana" },
      { name: "staj_yil", description: "Shu kompaniyadagi staj, yil" },
      { name: "oylik_som", description: "Oylik maosh (soliqdan oldin), so'm" },
      { name: "oxirgi_baho", description: "Oxirgi yillik baho, 1–5" },
      { name: "ishdan_ketgan", description: "Ha — yil davomida ketgan, Yo'q — ishlayapti" },
    ],
    rows,
  };
}

export function sampleDatasets(): SampleDataset[] {
  return [retail(), bank(), telecom(), ecommerce(), hr()];
}

/** CSV with a UTF-8 BOM (so Excel opens Uzbek letters correctly) and quoting where needed. */
export function toCsv(d: SampleDataset): string {
  const cell = (v: Cell) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [d.columns.map((c) => c.name).join(","), ...d.rows.map((row) => row.map(cell).join(","))];
  return `﻿${lines.join("\n")}\n`;
}

export const SAMPLE_CHALLENGE = {
  slug: "noyabr-megamart-filiallar",
  title: "Noyabr challenge: MegaMart filiallarini qutqaring",
  short_description: "Bir filialda savdo keskin tushib ketgan. Sababini toping va rahbariyatga dashboard tayyorlang.",
  datasetSlug: "megamart-chakana-savdo-2025",
  brief_md: `Siz **MegaMart** tarmog'ining tahlilchisisiz. Rahbariyat yil yakunida savol berdi: *"Qaysi filiallarimiz yaxshi ishlayapti, qaysilari yomon va nima qilishimiz kerak?"*

**Vazifa**
1. Datasetni tozalang (filial nomlari, takrorlar, qaytarishlar, xato narx).
2. Filiallar va oylar bo'yicha tushumni ko'rsatadigan **bir sahifalik dashboard** yasang (Excel, Power BI yoki boshqa vosita).
3. Savdo tushgan filialni toping: qachondan va qancha tushgan?
4. Rahbariyatga **3 ta aniq tavsiya** yozing.

Natijani Power BI / Tableau Public / Google Drive / GitHub'ga joylang va havolani yuboring.`,
  rules_md: `- Har bir ishtirokchi bitta ish topshiradi (challenge tugaguncha yangilash mumkin).
- Ish o'zingizniki bo'lishi kerak. Boshqalarning ishidan nusxa olinsa, ish hisobga olinmaydi.
- G'oliblar tahlil chuqurligi, dashboard aniqligi va tavsiyalar foydaliligi bo'yicha tanlanadi.
- Ishlar challenge tugagandan keyin hamma uchun ochiladi.`,
};
