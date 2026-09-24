import { LogOut } from "lucide-react";
import { uz } from "@/lib/i18n/uz";

// A real form POST, so it works even before JavaScript loads.
export function LogoutButton({ className = "btn-secondary" }: { className?: string }) {
  return (
    <form action="/api/auth/logout" method="post">
      <button type="submit" className={className}>
        <LogOut className="size-4" aria-hidden="true" />
        {uz.nav.logout}
      </button>
    </form>
  );
}
