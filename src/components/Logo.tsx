import Link from "next/link";
import { uz } from "@/lib/i18n/uz";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0B6E4F" />
      <path d="M9 22V14M16 22V10M23 22v-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", suffix }: { href?: string; suffix?: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2.5 rounded-lg">
      <LogoMark />
      <span className="font-display text-lg font-bold">{uz.brand.name}</span>
      {suffix ? <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">{suffix}</span> : null}
    </Link>
  );
}
