import "server-only";
import { z } from "zod";

// Server-side environment variables, validated on first use.
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  TELEGRAM_BOT_TOKEN: z.string().regex(/^\d+:[\w-]+$/, "Invalid Telegram bot token"),
  ALLOW_DEV_LOGIN: z.string().optional(),
});

let cached: z.infer<typeof serverSchema> | null = null;

export function serverEnv() {
  if (!cached) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        "Missing or invalid environment variables: " +
          parsed.error.issues.map((i) => i.path.join(".")).join(", ") +
          ". Check .env.local (see .env.example).",
      );
    }
    cached = parsed.data;
  }
  return cached;
}

export function devLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_LOGIN === "true";
}
