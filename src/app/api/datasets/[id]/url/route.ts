import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Short-lived (2 minute) download link for a dataset file, only for students who can open a
// lesson that uses it. Files stay in a private bucket; there is no download button anywhere.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(400, "validation_failed");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return apiError(401, "not_logged_in");
  if (!(await rateLimit(`dataset-url:${userId}`, 60, 60))) return apiError(429, "rate_limited");

  // RLS: the row is only visible if the user may access this dataset.
  const { data: dataset } = await supabase.from("datasets").select("storage_path").eq("id", id).maybeSingle();
  if (!dataset) return apiError(403, "forbidden");

  const { data, error } = await createAdminClient().storage.from("datasets").createSignedUrl(dataset.storage_path, 120);
  if (error || !data) return apiError(500, "generic");
  return apiOk({ url: data.signedUrl });
}
