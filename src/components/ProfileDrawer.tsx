"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { uz } from "@/lib/i18n/uz";

// Right panel with profile settings. Opens from the avatar; closes with X, a click outside or Esc.
export function ProfileDrawer({
  name,
  avatarUrl,
  children,
}: {
  name: string;
  avatarUrl: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={uz.nav.openProfile}
        className="flex size-11 items-center justify-center rounded-full"
      >
        <Avatar name={name} url={avatarUrl} />
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-label={uz.profile.title}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <Link href="/profil" onClick={() => setOpen(false)} className="btn-ghost -ml-2 px-2 text-sm" aria-label={uz.panel.openFull}>
            {uz.profile.title}
            <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
          <button ref={closeRef} type="button" onClick={close} className="btn-ghost size-11 px-0" aria-label={uz.panel.close}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
      </aside>
    </>
  );
}
