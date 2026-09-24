import { headers } from "next/headers";
import { TopBar } from "@/components/TopBar";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { isAdminHost } from "@/lib/host";
import { uz } from "@/lib/i18n/uz";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = isSupabaseConfigured() ? await getCurrentUser() : null;
  const admin = isAdminHost((await headers()).get("host"));
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        {uz.nav.skipToContent}
      </a>
      <TopBar user={user} admin={admin} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} {uz.brand.name}
      </footer>
    </div>
  );
}
