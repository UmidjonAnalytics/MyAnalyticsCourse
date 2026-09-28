// Spreadsheet embeds for Excel assignments. Admins may paste either a URL or the whole
// <iframe ...> embed code from OneDrive; we keep only a URL from a trusted host.

const ALLOWED_HOSTS = [
  /(^|\.)onedrive\.live\.com$/,
  /(^|\.)sharepoint\.com$/,
  /^view\.officeapps\.live\.com$/,
  /^excel\.officeapps\.live\.com$/,
  /^docs\.google\.com$/,
];

/** Returns a safe https embed URL, or null if the input is not an allowed spreadsheet embed. */
export function normalizeEmbedUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  let raw = input.trim();
  const src = raw.match(/src\s*=\s*["']([^"']+)["']/i);
  if (src?.[1]) raw = src[1];
  raw = raw.replace(/&amp;/g, "&");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!ALLOWED_HOSTS.some((re) => re.test(url.hostname))) return null;
  // Google Sheets: must be a published/embeddable link.
  if (url.hostname === "docs.google.com" && !url.pathname.startsWith("/spreadsheets/")) return null;
  return url.toString();
}

/** Microsoft's free viewer for an .xlsx reachable at a (signed) URL. */
export function officeViewerUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}
