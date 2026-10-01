import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { Spinner } from "@/components/Spinner";
import { ProfileSections } from "@/components/profile/ProfileSections";
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
            <>
              <Link href="/#kurslar" className="btn-ghost hidden sm:inline-flex">
                {uz.nav.catalog}
              </Link>
              <Link href="/yollar" className="btn-ghost hidden md:inline-flex">
                {uz.nav.paths}
              </Link>
              <Link href="/loyihalar" className="btn-ghost hidden md:inline-flex">
                {uz.nav.projects}
              </Link>
            </>
          ) : null}
          {user && !admin ? (
            <Link href="/mening-kurslarim" className="btn-ghost">
              {uz.nav.myCourses}
            </Link>
          ) : null}
          {user ? (
            <ProfileDrawer name={name} avatarUrl={user.profile?.avatar_url ?? null}>
              <Suspense fallback={<Spinner />}>
                <ProfileSections compact />
              </Suspense>
            </ProfileDrawer>
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
