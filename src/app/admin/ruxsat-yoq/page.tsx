import type { Metadata } from "next";
import { ShieldX } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { uz } from "@/lib/i18n/uz";

export const metadata: Metadata = { title: uz.admin.forbiddenTitle };

// Shown on the admin host to logged-in users who are not admins.
export default function AdminForbidden() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="flex h-16 items-center px-4">
          <Logo suffix={uz.brand.adminName} />
        </div>
      </header>
      <main className="mx-auto max-w-lg flex-1 px-4 py-20 text-center">
        <ShieldX className="mx-auto size-10 text-muted" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">{uz.admin.forbiddenTitle}</h1>
        <p className="mt-2 text-muted">{uz.admin.forbiddenText}</p>
        <div className="mt-8 flex justify-center">
          <LogoutButton className="btn-primary" />
        </div>
      </main>
    </div>
  );
}
