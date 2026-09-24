import { NextResponse, type NextRequest } from "next/server";
import { registerCurrentDevice } from "@/lib/auth/device";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Google / Apple / Facebook send the browser back here after login or account linking.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"), "/");
  const back = next.startsWith("/profil") ? "/profil" : "/kirish";

  const fail = (code: string) => {
    const url = new URL(back, request.url);
    url.searchParams.set("xato", code);
    if (back === "/kirish" && next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };

  const providerError = searchParams.get("error_code") ?? searchParams.get("error");
  if (providerError) return fail(providerError === "access_denied" ? "oauth_failed" : providerError);

  const code = searchParams.get("code");
  if (!code) return fail("oauth_failed");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.code ?? "oauth_failed");

  const device = await registerCurrentDevice(supabase);
  if (!device.ok) {
    await supabase.auth.signOut({ scope: "local" });
    return fail(device.code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
