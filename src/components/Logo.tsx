import Link from "next/link";
import { uz } from "@/lib/i18n/uz";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2.5 font-display text-lg font-bold text-text">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-accent text-sm text-accent-fg">
        DA
      </span>
      <span>{uz.brand.name}</span>
    </Link>
  );
}
