import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";

// Second check (after the proxy): only role 'admin' gets here. RLS enforces it a third time.
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="flex h-16 items-center justify-between gap-4 px-4">
          <Logo suffix={uz.brand.adminName} />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold sm:inline">{profile.full_name || profile.email || profile.phone}</span>
            <Avatar name={profile.full_name || "A"} url={profile.avatar_url} />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b border-border bg-surface p-3 md:w-64 md:shrink-0 md:border-b-0 md:border-r">
          <AdminNav />
          <div className="mt-4 border-t border-border pt-4">
            <LogoutButton className="btn-ghost w-full justify-start" />
          </div>
        </aside>
        <main id="main" className="min-w-0 flex-1 p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
