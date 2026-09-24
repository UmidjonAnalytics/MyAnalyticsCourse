// Number, money and date formatting for Uzbek UI.

const TZ = "Asia/Tashkent";

/** 1990000 -> "1 990 000 so'm" */
export function formatSom(amount: number): string {
  const s = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${s} so'm`;
}

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

function parts(date: Date) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const get = (type: string) => f.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return { y: get("year"), m: Number(get("month")), d: Number(get("day")), hh: get("hour"), mm: get("minute") };
}

/** "24-sentabr 2026, 14:05" (Tashkent time) */
export function formatDateTime(iso: string | Date): string {
  const p = parts(typeof iso === "string" ? new Date(iso) : iso);
  return `${p.d}-${MONTHS[p.m - 1] ?? ""} ${p.y}, ${p.hh}:${p.mm}`;
}

/** "24-sentabr 2026" */
export function formatDate(iso: string | Date): string {
  const p = parts(typeof iso === "string" ? new Date(iso) : iso);
  return `${p.d}-${MONTHS[p.m - 1] ?? ""} ${p.y}`;
}

/** Short description of a browser from its user agent: "Chrome, Windows". */
export function describeUserAgent(ua: string): string | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /YaBrowser\//.test(ua)
        ? "Yandex"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : /Safari\//.test(ua)
              ? "Safari"
              : null;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  if (!browser && !os) return null;
  return [browser, os].filter(Boolean).join(", ");
}
