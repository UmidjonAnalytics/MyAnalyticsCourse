import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { serverEnv } from "@/lib/env";

// Supabase client acting as the logged-in user (RLS applies). Use in Server Components,
// Server Actions and Route Handlers.
export async function createClient() {
  // Read cookies first: this marks the page as dynamic (never pre-rendered at build time).
  const cookieStore = await cookies();
  const env = serverEnv();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there. The proxy refreshes them.
        }
      },
    },
  });
}
