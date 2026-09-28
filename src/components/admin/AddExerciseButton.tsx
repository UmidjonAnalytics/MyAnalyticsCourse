"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createExercise } from "@/app/admin/(panel)/actions/practice";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

export function AddExerciseButton({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await createExercise(lessonId);
          if (!res.ok) return toast(res.error, "error");
          router.push(`/mashqlar/${res.id}`);
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
      {uz.admin.exercises.add}
    </button>
  );
}
