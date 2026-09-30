"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveInstructor } from "@/app/admin/(panel)/actions/learning";
import { MarkdownField } from "@/components/admin/fields";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.instructors;

export function InstructorForm({
  instructor,
}: {
  instructor?: { id: string; name: string; title: string; bio_md: string; photo_url: string | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const idp = instructor?.id ?? "new";

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveInstructor({
        ...(instructor ? { id: instructor.id } : {}),
        name: String(fd.get("name") ?? ""),
        title: String(fd.get("title") ?? ""),
        bio_md: String(fd.get("bio_md") ?? ""),
        photo_url: String(fd.get("photo_url") ?? ""),
      });
      if (!res.ok) return void toast(res.error, "error");
      toast(res.message ?? uz.admin.common.saved);
      if (!instructor) setFormKey((k) => k + 1);
      router.refresh();
    });
  };

  return (
    <form key={formKey} onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idp}-name`} className="label">
            {t.name}
          </label>
          <input id={`${idp}-name`} name="name" className="input" defaultValue={instructor?.name} maxLength={120} required />
        </div>
        <div>
          <label htmlFor={`${idp}-title`} className="label">
            {t.titleLabel}
          </label>
          <input id={`${idp}-title`} name="title" className="input" defaultValue={instructor?.title} maxLength={200} />
        </div>
      </div>
      <div>
        <label htmlFor={`${idp}-photo`} className="label">
          {t.photo}
        </label>
        <input id={`${idp}-photo`} name="photo_url" className="input" inputMode="url" defaultValue={instructor?.photo_url ?? ""} placeholder="https://" />
      </div>
      <MarkdownField name="bio_md" label={t.bio} defaultValue={instructor?.bio_md} rows={5} />
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
        {instructor ? uz.admin.common.save : t.add}
      </button>
    </form>
  );
}
