import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { ADMIN_HOST_SHARED_PREFIXES, DEVICE_COOKIE, PROTECTED_PREFIXES } from "@/lib/auth/constants";
import { isAdminHost } from "@/lib/host";
import { safeNext } from "@/lib/safe-next";

// Runs before every page and API request (Next.js 16 calls middleware "proxy"):
//  1. Admin host (admin.*): rewrites /x -> /admin/x; the student site answers 404 for /admin.
//  2. Refreshes the Supabase session cookies.
//  3. Checks this device is still one of the student's active devices (max 2).
//  4. Admin host needs role 'admin'; private student pages need a login.

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const admin = isAdminHost(request.headers.get("host"));

  if (admin && pathname === "/robots.txt") {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      headers: { "content-type": "text/plain", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  // The admin pages only exist on the admin host.
  if (!admin && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    return NextResponse.rewrite(new URL("/__not-found", request.url));
  }

  const sharedOnAdmin = admin && matchesPrefix(pathname, ADMIN_HOST_SHARED_PREFIXES);
  let rewriteTo = admin && !sharedOnAdmin ? `/admin${pathname === "/" ? "" : pathname}` : null;

  const forward = () =>
    rewriteTo
      ? NextResponse.rewrite(new URL(rewriteTo + search, request.url), { request: { headers: request.headers } })
      : NextResponse.next({ request: { headers: request.headers } });

  let response = forward();

  const finish = (res: NextResponse) => {
    // Keep any cookies Supabase just refreshed.
    if (res !== response) for (const cookie of response.cookies.getAll()) res.cookies.set(cookie);
    if (admin) res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return finish(response); // not configured yet: pages show their own message

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = forward();
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const isApi = pathname.startsWith("/api/");

  const loginRedirect = (reason?: string) => {
    const target = new URL("/kirish", request.url);
    if (reason) target.searchParams.set("sabab", reason);
    if (pathname !== "/") target.searchParams.set("next", pathname + search);
    return NextResponse.redirect(target);
  };

  const deviceId = request.cookies.get(DEVICE_COOKIE)?.value;

  // Sign this browser out and tell the student why (pushed out by a 3rd device, or removed).
  const signedOutDevice = async () => {
    await supabase.auth.signOut({ scope: "local" });
    let reason = "device";
    if (deviceId) {
      const { data: why } = await supabase.rpc("device_revoke_reason", { p_device_id: deviceId });
      if (why === "user" || why === "admin") reason = "device-removed";
    }
    const res = isApi ? NextResponse.json({ error: { code: "session_revoked" } }, { status: 401 }) : loginRedirect(reason);
    finish(res);
    for (const c of request.cookies.getAll()) if (c.name.startsWith("sb-")) res.cookies.delete(c.name);
    return res;
  };

  if (userId && !pathname.startsWith("/api/hooks/")) {
    let active = false;
    if (deviceId) {
      const { data: ok, error } = await supabase.rpc("touch_device_session", { p_device_id: deviceId });
      active = !error && ok === true;
    }
    if (!active) return signedOutDevice();
  }

  // The session cookie is still here but the session was already ended on the server
  // (its device was revoked). Explain it once instead of silently showing the login page.
  if (!userId && deviceId && !isApi) {
    const hasSessionCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
    if (hasSessionCookie) {
      const { data: why } = await supabase.rpc("device_revoke_reason", { p_device_id: deviceId });
      if (why === "limit" || why === "user" || why === "admin") return signedOutDevice();
    }
  }

  // Already logged in: skip the login page.
  if (userId && pathname === "/kirish") {
    return finish(NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url)));
  }

  if (admin && !sharedOnAdmin) {
    if (!userId) return finish(loginRedirect());
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile?.role !== "admin" && pathname !== "/ruxsat-yoq") {
      rewriteTo = "/admin/ruxsat-yoq";
      const refreshed = response;
      response = forward();
      for (const cookie of refreshed.cookies.getAll()) response.cookies.set(cookie);
    }
    return finish(response);
  }

  if (!admin && !userId && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    return finish(loginRedirect("kerak"));
  }

  return finish(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
