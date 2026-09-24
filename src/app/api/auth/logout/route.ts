import { NextResponse, type NextRequest } from "next/server";
import { currentDeviceId } from "@/lib/auth/device";
import { createClient } from "@/lib/supabase/server";

// "Hisobdan chiqish" button (a form POST).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const deviceId = await currentDeviceId();
  if (deviceId) await supabase.rpc("end_device_session", { p_device_id: deviceId });
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/kirish?sabab=chiqdi", request.url), { status: 303 });
}
