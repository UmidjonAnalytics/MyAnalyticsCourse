"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { uz } from "@/lib/i18n/uz";

// Site menu for phones and tablets (the header shows these links inline on wide screens).
// Closes when a link is chosen, on Esc, or on a click outside.
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <div ref={root} className="lg:hidden">
      <button
        ref={button}
        type="button"
        className="btn-ghost size-11 px-0"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? uz.nav.closeMenu : uz.nav.menu}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>
      <div id={id} hidden={!open} className="absolute inset-x-0 top-16 z-40 border-b border-border bg-surface shadow-lg">
        <ul className="mx-auto max-w-6xl px-4 py-2">
          {links.map((l) => {
            const current = l.href === pathname;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-12 items-center rounded-lg px-3 font-semibold hover:bg-surface-muted ${current ? "text-accent-text" : ""}`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
