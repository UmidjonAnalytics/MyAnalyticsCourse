import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteOpenDataset } from "@/app/admin/(panel)/actions/content";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { OpenDatasetForm } from "@/components/admin/OpenDatasetForm";
import { publicSiteUrl } from "@/lib/admin/links";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.openData.edit };

export default async function EditOpenDataset({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: dataset } = await supabase.from("open_datasets").select("*").eq("id", id).maybeSingle();
  if (!dataset) notFound();
  const site = await publicSiteUrl();
  const t = uz.admin.openData;
  return (
    <div className="max-w-4xl">
      <Link href="/ochiq-datasetlar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.title}
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{dataset.title}</h1>
          <p className="text-sm text-muted">{t.downloads(dataset.download_count)}</p>
          {site && dataset.is_published ? (
            <a href={`${site}/dataset/${dataset.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent-text hover:underline">
              {site.replace(/^https?:\/\//, "")}/dataset/{dataset.slug}
            </a>
          ) : null}
        </div>
        <ConfirmButton label={t.delete} confirm={t.deleteConfirm} action={deleteOpenDataset.bind(null, dataset.id)} className="btn-danger" danger />
      </div>
      <OpenDatasetForm dataset={dataset} />
    </div>
  );
}
