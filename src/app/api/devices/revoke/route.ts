import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

// Student logs out one of their other devices ("Chiqarish").
const body = z.object({ id: z.uuid() });

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "validation_failed");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return apiError(401, "not_logged_in");

  const { error } = await supabase.rpc("revoke_my_device", { p_id: parsed.data.id });
  if (error) return apiError(400, "generic");
  return apiOk();
}
