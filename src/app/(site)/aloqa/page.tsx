import type { Metadata } from "next";
import { AtSign, Building2, Clock, Mail, Phone, Send } from "lucide-react";
import { getSiteSettings } from "@/lib/data/site";
import { uz } from "@/lib/i18n/uz";

export const metadata: Metadata = { title: uz.legal.contacts };
const t = uz.legal;

export default async function ContactsPage() {
  const s = await getSiteSettings();
  const rows = [
    s.phone ? { Icon: Phone, label: t.phone, value: s.phone, href: `tel:${s.phone.replace(/[^\d+]/g, "")}` } : null,
    s.email ? { Icon: Mail, label: t.email, value: s.email, href: `mailto:${s.email}` } : null,
    s.telegram_url ? { Icon: Send, label: t.telegram, value: s.telegram_url.replace(/^https:\/\//, ""), href: s.telegram_url } : null,
    s.instagram_url ? { Icon: AtSign, label: t.instagram, value: s.instagram_url.replace(/^https:\/\/(www\.)?/, ""), href: s.instagram_url } : null,
    s.support_hours ? { Icon: Clock, label: t.hours, value: s.support_hours, href: null } : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-bold">{t.contactsTitle}</h1>
      <p className="mt-2 text-lg text-muted">{t.contactsLead}</p>
      <ul className="card mt-8 divide-y divide-border">
        {rows.map(({ Icon, label, value, href }) => (
          <li key={label} className="flex min-h-14 items-center gap-4 px-5 py-3">
            <Icon className="size-5 shrink-0 text-accent-text" aria-hidden="true" />
            <span className="w-28 shrink-0 text-sm text-muted">{label}</span>
            {href ? (
              <a href={href} className="min-w-0 break-words font-semibold hover:underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {value}
              </a>
            ) : (
              <span className="font-semibold">{value}</span>
            )}
          </li>
        ))}
      </ul>
      {s.company_name ? (
        <section aria-labelledby="company" className="mt-8">
          <h2 id="company" className="flex items-center gap-2 text-lg font-bold">
            <Building2 className="size-5 text-accent-text" aria-hidden="true" />
            {t.company}
          </h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div>
              <dt className="inline text-muted">{s.company_name}</dt>
            </div>
            {s.stir ? (
              <div>
                <dt className="inline text-muted">{t.stir}: </dt>
                <dd className="inline font-semibold">{s.stir}</dd>
              </div>
            ) : null}
            {s.address ? (
              <div>
                <dt className="inline text-muted">{t.address}: </dt>
                <dd className="inline">{s.address}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
