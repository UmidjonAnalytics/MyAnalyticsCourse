"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { updateFullName, type NameFormState } from "@/app/(site)/profil/actions";
import { Notice } from "@/components/Notice";
import { uz } from "@/lib/i18n/uz";

export function NameForm({ initialName }: { initialName: string }) {
  const [state, action, pending] = useActionState<NameFormState, FormData>(updateFullName, { status: "idle" });
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="full_name" className="label">
          {uz.profile.fullName}
        </label>
        <div className="flex gap-2">
          <input
            id="full_name"
            name="full_name"
            defaultValue={initialName}
            placeholder={uz.profile.fullNamePlaceholder}
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            className="input"
          />
          <button type="submit" className="btn-primary shrink-0" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? uz.common.saving : uz.common.save}
          </button>
        </div>
      </div>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "saved" && !pending ? (
        <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-accent-text">
          <Check className="size-4" aria-hidden="true" />
          {uz.common.saved}
        </p>
      ) : null}
    </form>
  );
}
