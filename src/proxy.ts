import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { DEVICE_COOKIE, type SignOutReason } from "@/lib/auth/constants";

// Runs before every page and API request:
//  1. refreshes the Supabase session cookies,
//  2. checks this device is still one of the student's active devices (max 2),
//  3. blocks /admin for non-admins and private pages for logged-out visitors.

const PUBLIC_PATHS = ["/"];
const PUBLIC_PREFIXES = ["/api/auth/"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function isApi(pathname: string) {
  return pathname.startsWith("/api/");
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response; // not configured yet: pages show their own errors

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Build a redirect / JSON response that keeps any cookies Supabase just set or cleared.
  const withCookies = (res: NextResponse) => {
    for (const cookie of response.cookies.getAll()) res.cookies.set(cookie);
    return res;
  };
  const redirectTo = (path: string) => withCookies(NextResponse.redirect(new URL(path, request.url)));
  const jsonError = (status: number, message: string) =>
    withCookies(NextResponse.json({ error: message }, { status }));

  const { pathname } = request.nextUrl;
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    if (isPublic(pathname)) return response;
    return isApi(pathname) ? jsonError(401, "unauthorized") : redirectTo("/");
  }

  // Logged in: is this device still allowed?
  const deviceId = request.cookies.get(DEVICE_COOKIE)?.value;
  let active = false;
  if (deviceId) {
    const { data: ok, error } = await supabase.rpc("touch_device_session", { p_device_id: deviceId });
    active = !error && ok === true;
  }
  if (!active) {
    await supabase.auth.signOut({ scope: "local" });
    const reason: SignOutReason = "device";
    if (isApi(pathname)) return jsonError(401, "device_revoked");
    return redirectTo(`/?sabab=${reason}`);
  }

  if (pathname === "/") return redirectTo("/learn");

  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile?.role !== "admin") {
      return isApi(pathname) ? jsonError(403, "forbidden") : redirectTo("/learn");
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
