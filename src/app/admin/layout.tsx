import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { getCurrentUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";

// Second check after the proxy: only admins get past this layout. RLS enforces it again in the database.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.profile.role !== "admin") redirect("/learn");

  return (
    <>
      <TopBar profile={user.profile} homeHref="/admin" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
        <nav aria-label={uz.admin.title} className="md:w-56 md:shrink-0">
          <ul className="flex gap-1 md:flex-col">
            <li>
              <Link href="/admin" className="btn-ghost w-full justify-start bg-surface-muted">
                <LayoutDashboard aria-hidden className="size-4" />
                {uz.admin.nav.dashboard}
              </Link>
            </li>
            <li>
              <Link href="/learn" className="btn-ghost w-full justify-start">
                <ArrowLeft aria-hidden className="size-4" />
                {uz.admin.backToSite}
              </Link>
            </li>
          </ul>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
