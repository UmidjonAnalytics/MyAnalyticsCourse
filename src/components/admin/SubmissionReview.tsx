"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { reviewSubmission } from "@/app/admin/(panel)/actions/content";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.projects;

export function SubmissionReview({ id, feedback: initial }: { id: string; feedback: string }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initial);
  const [pending, startTransition] = useTransition();
  const fieldId = `feedback-${id}`;

  const review = (status: "approved" | "needs_work") =>
    startTransition(async () => {
      const res = await reviewSubmission({ id, status, feedback });
      if (res.ok) toast(res.message ?? uz.admin.common.saved);
      else toast(res.error, "error");
      router.refresh();
    });

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={fieldId} className="label">
          {t.feedback}
        </label>
        <textarea id={fieldId} className="input min-h-20 py-2 text-sm" maxLength={4000} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => review("approved")} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
          {t.approve}
        </button>
        <button type="button" className="btn-secondary" onClick={() => review("needs_work")} disabled={pending}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {t.needsWork}
        </button>
      </div>
    </div>
  );
}
