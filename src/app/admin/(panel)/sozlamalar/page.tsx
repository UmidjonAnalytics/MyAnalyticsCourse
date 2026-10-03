import type { Metadata } from "next";
import { SitePageForm, SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { publicSiteUrl } from "@/lib/admin/links";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.settings.title };

export default async function SiteSettingsPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: pages }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("site_pages").select("slug, title, body_md").order("slug"),
  ]);
  const t = uz.admin.settings;
  const editable = {
    company_name: settings?.company_name ?? "",
    stir: settings?.stir ?? "",
    address: settings?.address ?? "",
    phone: settings?.phone ?? "",
    email: settings?.email ?? "",
    telegram_url: settings?.telegram_url ?? "",
    instagram_url: settings?.instagram_url ?? "",
    support_hours: settings?.support_hours ?? "",
  };
  const site = await publicSiteUrl();
  const order = ["oferta", "maxfiylik", "qaytarish"];
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 text-muted">{t.lead}</p>
      </div>
      <SiteSettingsForm settings={editable} />
      <section aria-labelledby="legal-pages" className="space-y-4">
        <div>
          <h2 id="legal-pages" className="text-xl font-bold">
            {t.pages}
          </h2>
          <p className="mt-1 text-sm text-muted">{t.pagesLead}</p>
        </div>
        {[...(pages ?? [])]
          .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug))
          .map((p) => (
            <SitePageForm key={p.slug} page={p} siteUrl={site} />
          ))}
      </section>
    </div>
  );
}
