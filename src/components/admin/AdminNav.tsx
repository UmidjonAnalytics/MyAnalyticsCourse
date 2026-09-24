"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BookOpen,
  Database,
  FlaskConical,
  LayoutDashboard,
  ListTree,
  Package,
  Receipt,
  Tag,
  Users,
} from "lucide-react";
import { uz } from "@/lib/i18n/uz";

// Links are written WITHOUT the /admin prefix: on admin.<domain> the proxy adds it.
const items = [
  { href: "/", label: uz.admin.nav.dashboard, Icon: LayoutDashboard, ready: true },
  { href: "/kurslar", label: uz.admin.nav.courses, Icon: BookOpen, ready: false },
  { href: "/darslar", label: uz.admin.nav.modules, Icon: ListTree, ready: false },
  { href: "/toplamlar", label: uz.admin.nav.bundles, Icon: Package, ready: false },
  { href: "/promo", label: uz.admin.nav.promo, Icon: Tag, ready: false },
  { href: "/buyurtmalar", label: uz.admin.nav.orders, Icon: Receipt, ready: false },
  { href: "/talabalar", label: uz.admin.nav.students, Icon: Users, ready: false },
  { href: "/datasetlar", label: uz.admin.nav.datasets, Icon: Database, ready: false },
  { href: "/mashqlar", label: uz.admin.nav.exercises, Icon: FlaskConical, ready: false },
  { href: "/arxiv", label: uz.admin.nav.archive, Icon: Archive, ready: false },
];

export function AdminNav() {
  const pathname = usePathname();
  // usePathname shows the internal path (/admin/...) after the rewrite.
  const current = pathname.replace(/^\/admin/, "") || "/";

  return (
    <nav aria-label={uz.brand.adminName}>
      <ul className="space-y-1">
        {items.map(({ href, label, Icon, ready }) => {
          const active = href === "/" ? current === "/" : current.startsWith(href);
          const base = "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold";
          const cls = `${base} ${active ? "bg-accent-soft text-accent-text" : "text-text hover:bg-surface-muted"}`;
          return (
            <li key={href}>
              {ready ? (
                <Link href={href} className={cls} aria-current={active ? "page" : undefined}>
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              ) : (
                <span className={`${base} cursor-default text-muted`} aria-disabled="true">
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{label}</span>
                  <span className="shrink-0 whitespace-nowrap text-xs font-normal">{uz.common.soon}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
