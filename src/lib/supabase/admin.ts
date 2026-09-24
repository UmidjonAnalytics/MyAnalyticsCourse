import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverEnv } from "@/lib/env";

// Service-role client: BYPASSES Row Level Security. Server code only, and only after
// checking who is asking.
export function createAdminClient() {
  const env = serverEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
