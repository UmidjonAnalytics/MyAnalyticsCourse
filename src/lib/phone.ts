// Uzbek phone numbers. Stored as digits only: 998 + 9 digits (e.g. 998901234567).

const UZ_PHONE = /^998\d{9}$/;

/** Accepts "90 123 45 67", "+998 90 123-45-67", "998901234567"... Returns "998901234567" or null. */
export function normalizeUzPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 9) digits = `998${digits}`;
  return UZ_PHONE.test(digits) ? digits : null;
}

/** "998901234567" -> "+998 90 123 45 67" */
export function formatUzPhone(phone: string | null | undefined): string {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!UZ_PHONE.test(d)) return phone ?? "";
  return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}

/** Formats the 9 local digits while typing: "901234567" -> "90 123 45 67" */
export function formatLocalDigits(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(" ");
}

/** "+998 90 *** ** 67" for showing where a code was sent. */
export function maskUzPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (!UZ_PHONE.test(d)) return phone;
  return `+998 ${d.slice(3, 5)} *** ** ${d.slice(10, 12)}`;
}
