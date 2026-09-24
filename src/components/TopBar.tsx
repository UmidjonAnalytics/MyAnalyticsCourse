import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { uz } from "@/lib/i18n/uz";
import type { Profile } from "@/lib/database.types";

// Phase 1 top bar. Phase 2 adds course progress and the side-panel toggles.
export function TopBar({ profile, homeHref = "/learn" }: { profile: Profile; homeHref?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo href={homeHref} />
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar name={profile.full_name} photoUrl={profile.photo_url} size={36} />
            <span className="text-sm font-semibold">{profile.full_name}</span>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn-ghost px-3">
              <LogOut aria-hidden className="size-4" />
              <span>{uz.profile.logout}</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
