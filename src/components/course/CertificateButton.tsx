"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Loader2 } from "lucide-react";
import { claimCertificate } from "@/app/(site)/kurs/actions";
import { Notice } from "@/components/Notice";
import { uz } from "@/lib/i18n/uz";

const t = uz.certificate;

// "Sertifikatni olish": the database decides whether the course is really finished.
export function CertificateButton({ courseId, className = "btn-primary w-full" }: { courseId: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ text: string; needName?: boolean } | null>(null);

  const claim = () =>
    startTransition(async () => {
      setError(null);
      const res = await claimCertificate(courseId);
      if (res.ok) router.push(`/sertifikat/${res.code}`);
      else setError({ text: res.error, needName: res.needName });
    });

  return (
    <div className="space-y-3">
      <button type="button" className={className} onClick={claim} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Award className="size-4" aria-hidden="true" />}
        {pending ? t.getting : t.get}
      </button>
      {error ? (
        <Notice tone="error">
          {error.text}{" "}
          {error.needName ? (
            <Link href="/profil" className="font-semibold underline">
              {t.toProfile}
            </Link>
          ) : null}
        </Notice>
      ) : null}
    </div>
  );
}
