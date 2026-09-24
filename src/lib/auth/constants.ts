// Shared auth constants (safe to import from the proxy, server and browser).

export const DEVICE_COOKIE = "device_id";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ~13 months

// Why a visitor was sent to the login page (?sabab=...).
export type LoginReason = "device" | "device-removed" | "chiqdi" | "kerak";

// Student pages that need a logged-in user (prefix match).
export const PROTECTED_PREFIXES = ["/profil", "/mening-kurslarim", "/dars", "/tolov"];

// Paths on the admin host that are NOT rewritten into /admin (shared with the student site).
export const ADMIN_HOST_SHARED_PREFIXES = ["/api/", "/auth/", "/kirish"];

export type OAuthProvider = "google" | "apple" | "facebook";
