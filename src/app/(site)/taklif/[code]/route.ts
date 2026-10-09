import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL_CODE, REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from "@/lib/referral";

// Friend's invite link: remember the code, then go to the home page (which shows the discount note).
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const res = NextResponse.redirect(new URL("/", request.url));
  if (REFERRAL_CODE.test(code)) {
    res.cookies.set(REFERRAL_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: REFERRAL_COOKIE_DAYS * 86_400,
      path: "/",
    });
  }
  return res;
}
