import { NextResponse } from "next/server";
import { signOutCurrentDevice } from "@/lib/auth/login";

// POST /api/auth/logout — used by a plain <form>, so it answers with a redirect.
export async function POST(request: Request) {
  await signOutCurrentDevice();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
