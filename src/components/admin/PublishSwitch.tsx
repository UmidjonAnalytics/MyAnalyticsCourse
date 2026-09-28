"use client";

import { useOptimistic, useTransition } from "react";
import { setPublished } from "@/app/admin/(panel)/actions/content";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

// On/off switch for "E'lon qilingan" (published).
export function PublishSwitch({
  entity,
  id,
  name,
  value,
}: {
  entity: "course" | "module" | "lesson" | "bundle";
  id: string;
  name: string;
  value: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      setOptimistic(!optimistic);
      const res = await setPublished(entity, id, !optimistic);
      if (!res.ok) toast(res.error, "error");
    });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label={uz.admin.common.publishToggle(name)}
      onClick={toggle}
      disabled={pending}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-xs font-semibold"
    >
      <span className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors ${optimistic ? "bg-accent" : "bg-border-strong"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${optimistic ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </span>
      <span className={optimistic ? "text-accent-text" : "text-muted"}>{optimistic ? uz.admin.common.published : uz.admin.common.draft}</span>
    </button>
  );
}
