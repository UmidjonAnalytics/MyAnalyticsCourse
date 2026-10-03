import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OpenDatasetForm } from "@/components/admin/OpenDatasetForm";
import { uz } from "@/lib/i18n/uz";

export const metadata: Metadata = { title: uz.admin.openData.add };

export default function NewOpenDataset() {
  return (
    <div className="max-w-4xl">
      <Link href="/ochiq-datasetlar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.admin.openData.title}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{uz.admin.openData.add}</h1>
      <OpenDatasetForm />
    </div>
  );
}
