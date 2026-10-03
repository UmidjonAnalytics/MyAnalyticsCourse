import Link from "next/link";
import { getSiteSettings } from "@/lib/data/site";
import { uz } from "@/lib/i18n/uz";

// Footer: legal links (required by Payme/Click) and contacts from admin → "Sayt sozlamalari".
export async function SiteFooter() {
  const s = await getSiteSettings();
  const t = uz.legal;
  const links = [
    { href: "/datasetlar", label: t.datasets },
    { href: "/challenge", label: t.challenge },
    { href: "/oferta", label: t.oferta },
    { href: "/maxfiylik", label: t.privacy },
    { href: "/qaytarish", label: t.refunds },
    { href: "/aloqa", label: t.contacts },
  ];
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <p className="font-display text-base font-bold">{uz.brand.name}</p>
          <p className="text-muted">{uz.brand.tagline}</p>
          {s.phone || s.email ? (
            <p className="pt-2">
              {s.phone ? (
                <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="mr-4 font-semibold hover:underline">
                  {s.phone}
                </a>
              ) : null}
              {s.email ? (
                <a href={`mailto:${s.email}`} className="font-semibold hover:underline">
                  {s.email}
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
        <nav aria-label={t.company}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 sm:flex-col sm:items-end">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted hover:text-text hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs text-muted sm:col-span-2">
          © {new Date().getFullYear()} {s.company_name || uz.brand.name}. {t.footerRights}
          {s.stir ? ` · ${t.stir}: ${s.stir}` : ""}
        </p>
      </div>
    </footer>
  );
}
