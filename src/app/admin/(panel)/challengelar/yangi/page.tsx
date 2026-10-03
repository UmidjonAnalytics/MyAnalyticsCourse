import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChallengeForm } from "@/components/admin/ChallengeForm";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.challenges.add };

export default async function NewChallenge() {
  const supabase = await createClient();
  const { data: datasets } = await supabase.from("open_datasets").select("id, title").is("archived_at", null).order("position");
  return (
    <div className="max-w-4xl">
      <Link href="/challengelar" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {uz.admin.challenges.title}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{uz.admin.challenges.add}</h1>
      <ChallengeForm datasets={datasets ?? []} />
    </div>
  );
}
