// Shared by the proxy and route handlers.
export const DEVICE_COOKIE = "dv_id";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
export const MAX_DEVICES = 2;

// Why a user was signed out (shown on the landing page as ?sabab=...).
export type SignOutReason = "device" | "expired";

export function deviceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  };
}
