"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { installSampleContent } from "@/app/admin/(panel)/actions/samples";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.openData;

export function SampleContentButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <section aria-labelledby="samples" className="card mt-6 flex flex-wrap items-center gap-4 p-5">
      <div className="min-w-0 flex-1">
        <h2 id="samples" className="flex items-center gap-2 font-bold">
          <Sparkles className="size-5 text-accent-text" aria-hidden="true" />
          {t.samplesTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{t.samplesLead}</p>
      </div>
      <button
        type="button"
        className="btn-secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await installSampleContent();
            if (res.ok) toast(res.message ?? uz.admin.common.saved);
            else toast(res.error, "error");
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
        {pending ? t.samplesWorking : t.samplesButton}
      </button>
    </section>
  );
}
