import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOutCurrentDevice } from "@/lib/auth/login";
import { uz } from "@/lib/i18n/uz";

const bodySchema = z.object({ id: z.uuid() });

// POST /api/devices/revoke  { id } — a student logs out one of their own devices.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: uz.errors.unauthorized }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: uz.errors.invalidRequest }, { status: 400 });

  // RLS only returns the student's own rows, so this also proves ownership.
  const supabase = await createClient();
  const { data: device } = await supabase
    .from("device_sessions")
    .select("id, device_id")
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();
  if (!device) return NextResponse.json({ error: uz.errors.forbidden }, { status: 404 });

  if (device.device_id === user.deviceId) {
    await signOutCurrentDevice();
    return NextResponse.json({ ok: true, signedOut: true });
  }

  const { error } = await createAdminClient().rpc("revoke_device_session", { p_id: device.id, p_reason: "user" });
  if (error) {
    console.error("[device revoke]", error.message);
    return NextResponse.json({ error: uz.errors.generic }, { status: 500 });
  }
  return NextResponse.json({ ok: true, signedOut: false });
}
