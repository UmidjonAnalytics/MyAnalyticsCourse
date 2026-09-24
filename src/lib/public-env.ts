// Values that are safe to expose to the browser. Next.js inlines NEXT_PUBLIC_* at build time,
// so they must be referenced literally.
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  telegramBotUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};
