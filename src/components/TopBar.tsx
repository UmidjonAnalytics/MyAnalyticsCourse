import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MobileMenu } from "@/components/MobileMenu";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { Spinner } from "@/components/Spinner";
import { ProfileSections } from "@/components/profile/ProfileSections";
import type { CurrentUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";

const siteLinks = [
  { href: "/#kurslar", label: uz.nav.catalog },
  { href: "/yollar", label: uz.nav.paths },
  { href: "/loyihalar", label: uz.nav.projects },
  { href: "/datasetlar", label: uz.nav.datasets },
  { href: "/challenge", label: uz.nav.challenge },
];
const myCourses = { href: "/mening-kurslarim", label: uz.nav.myCourses };

export function TopBar({ user, admin = false }: { user: CurrentUser | null; admin?: boolean }) {
  const name = user?.profile?.full_name || uz.nav.profile;
  return (
    <header className="relative border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo suffix={admin ? uz.brand.adminName : undefined} />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Asosiy menyu">
          {!admin ? (
            <>
              {siteLinks.map((l) => (
                <Link key={l.href} href={l.href} className="btn-ghost hidden lg:inline-flex">
                  {l.label}
                </Link>
              ))}
              {user ? (
                <Link href={myCourses.href} className="btn-ghost hidden sm:inline-flex">
                  {myCourses.label}
                </Link>
              ) : null}
              <MobileMenu links={user ? [myCourses, ...siteLinks] : siteLinks} />
            </>
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
