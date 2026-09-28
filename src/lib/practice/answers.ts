// Checks one typed answer against the accepted answers (server only uses this; pure function).

/** "1 250 000", "1,250,000", "12,5" -> number. Returns null if not a number. */
export function parseNumber(input: string): number | null {
  let s = input.trim().replace(/\s|so'?m|%/gi, "");
  if (!s) return null;
  // "12,5" -> decimal comma; "1,250,000" -> thousands separators
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

const normText = (s: string, caseSensitive: boolean) => {
  const t = s.trim().replace(/\s+/g, " ").replace(/[‘’ʻʼ`]/g, "'");
  return caseSensitive ? t : t.toLowerCase();
};

export function answerCorrect(
  given: string,
  key: { type: "number" | "text"; answers: string[]; tolerance: number; caseSensitive: boolean },
): boolean {
  if (key.type === "number") {
    const g = parseNumber(given);
    if (g === null) return false;
    return key.answers.some((a) => {
      const n = parseNumber(a);
      return n !== null && Math.abs(g - n) <= Math.max(key.tolerance, 1e-9);
    });
  }
  const g = normText(given, key.caseSensitive);
  return g.length > 0 && key.answers.some((a) => normText(a, key.caseSensitive) === g);
}
