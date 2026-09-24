import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import type { CurrentUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";

export function TopBar({ user, admin = false }: { user: CurrentUser | null; admin?: boolean }) {
  const name = user?.profile?.full_name || uz.nav.profile;
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo suffix={admin ? uz.brand.adminName : undefined} />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Asosiy menyu">
          {!admin ? (
            <Link href="/" className="btn-ghost hidden sm:inline-flex">
              {uz.nav.catalog}
            </Link>
          ) : null}
          {user ? (
            <Link href="/profil" className="flex min-h-11 items-center gap-2 rounded-full px-1.5" aria-label={uz.nav.openProfile}>
              <Avatar name={name} url={user.profile?.avatar_url} />
            </Link>
          ) : (
            <Link href="/kirish" className="btn-primary">
              {uz.nav.login}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
