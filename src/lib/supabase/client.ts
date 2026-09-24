import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/public-env";

// Supabase client for Client Components (RLS applies).
export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
