// Shared auth constants (safe to import from the proxy, server and browser).

export const DEVICE_COOKIE = "device_id";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ~13 months

// Why a visitor was sent to the login page (?sabab=...).
export type LoginReason = "device" | "device-removed" | "chiqdi" | "kerak";

// Student pages that need a logged-in user (prefix match).
export const PROTECTED_PREFIXES = ["/profil", "/mening-kurslarim", "/dars", "/tolov"];

// Paths on the admin host that are NOT rewritten into /admin (shared with the student site).
export const ADMIN_HOST_SHARED_PREFIXES = ["/api/", "/auth/", "/kirish"];

// Test-mode accounts (DEV_LOGIN_CODE) get a placeholder email on this domain; it is never shown.
export const DEV_EMAIL_DOMAIN = "dev.invalid";

export function visibleEmail(email: string | null | undefined): string | null {
  return email && !email.endsWith(`@${DEV_EMAIL_DOMAIN}`) ? email : null;
}

export type OAuthProvider = "google" | "apple" | "facebook";
