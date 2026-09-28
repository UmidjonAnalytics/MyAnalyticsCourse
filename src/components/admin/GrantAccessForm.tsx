"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { grantAccess } from "@/app/admin/(panel)/actions/students";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin.students;

export function GrantAccessForm({
  userId,
  courses,
  bundles,
}: {
  userId: string;
  courses: Array<{ id: string; title: string }>;
  bundles: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [product, setProduct] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!product) return;
        startTransition(async () => {
          const res = await grantAccess({ userId, product, note });
          if (!res.ok) return toast(res.error, "error");
          toast(res.message ?? t.granted);
          setProduct("");
          setNote("");
          router.refresh();
        });
      }}
    >
      <div>
        <label htmlFor="grant-product" className="label">
          {t.grantProduct}
        </label>
        <select id="grant-product" value={product} onChange={(e) => setProduct(e.target.value)} className="input" required>
          <option value="">—</option>
          <optgroup label={uz.admin.courses.title}>
            {courses.map((c) => (
              <option key={c.id} value={`course:${c.id}`}>
                {c.title}
              </option>
            ))}
          </optgroup>
          {bundles.length > 0 ? (
            <optgroup label={uz.admin.bundles.title}>
              {bundles.map((b) => (
                <option key={b.id} value={`bundle:${b.id}`}>
                  {b.title}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>
      <div>
        <label htmlFor="grant-note" className="label">
          {t.grantNote}
        </label>
        <input id="grant-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.grantNotePlaceholder} maxLength={300} className="input" />
      </div>
      <button type="submit" className="btn-primary" disabled={pending || !product}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {t.grant}
      </button>
    </form>
  );
}
