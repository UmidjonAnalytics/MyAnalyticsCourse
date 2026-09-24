import "server-only";
import { z } from "zod";

// Server-side environment variables, validated once. See .env.example for descriptions.
const flag = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  SEND_SMS_HOOK_SECRET: z.string().optional(),
  SMS_PROVIDER: z.enum(["eskiz", "console"]).default("eskiz"),
  ESKIZ_EMAIL: z.string().optional(),
  ESKIZ_PASSWORD: z.string().optional(),
  ESKIZ_FROM: z.string().default("4546"),
  ESKIZ_API_URL: z.url().default("https://notify.eskiz.uz/api"),
  ENABLE_APPLE_LOGIN: flag,
  ENABLE_FACEBOOK_LOGIN: flag,
  ADMIN_HOSTNAMES: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Environment variables missing or invalid: ${missing}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

// Which optional login buttons to show.
export function loginFlags() {
  const on = (v: string | undefined) => v === "true" || v === "1";
  return {
    apple: on(process.env.ENABLE_APPLE_LOGIN),
    facebook: on(process.env.ENABLE_FACEBOOK_LOGIN),
  };
}
