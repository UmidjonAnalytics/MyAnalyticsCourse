"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createAssignment } from "@/app/admin/(panel)/actions/assignments";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

export function AddAssignmentButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await createAssignment(lessonId);
          if (!res.ok) return toast(res.error, "error");
          router.push(`/topshiriqlar/${res.id}`);
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
      {uz.admin.assignments.add}
    </button>
  );
}
