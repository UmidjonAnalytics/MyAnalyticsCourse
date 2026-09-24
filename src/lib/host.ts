// Admin panel lives on its own host: admin.<domain> (and admin.localhost:3000 locally).
// Extra admin hostnames can be listed in ADMIN_HOSTNAMES (comma-separated).

export function hostnameOf(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(":")[0] ?? "";
}

export function isAdminHost(host: string | null | undefined): boolean {
  const hostname = hostnameOf(host);
  if (!hostname) return false;
  if (hostname.startsWith("admin.")) return true;
  const extra = (process.env.ADMIN_HOSTNAMES ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(hostname);
}
