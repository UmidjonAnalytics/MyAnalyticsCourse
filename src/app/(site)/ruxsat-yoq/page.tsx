import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { uz } from "@/lib/i18n/uz";
import { SLUG_PATTERN } from "@/lib/slug";

export const metadata: Metadata = { title: uz.noAccess.title };

export default async function NoAccessPage({ searchParams }: { searchParams: Promise<{ kurs?: string }> }) {
  const { kurs } = await searchParams;
  const course = kurs && SLUG_PATTERN.test(kurs) ? kurs : null;
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <Lock className="mx-auto size-10 text-muted" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold">{uz.noAccess.title}</h1>
      <p className="mt-2 text-muted">{uz.noAccess.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {course ? (
          <Link href={`/kurs/${course}`} className="btn-primary">
            {uz.noAccess.toCourse}
          </Link>
        ) : null}
        <Link href="/#kurslar" className={course ? "btn-secondary" : "btn-primary"}>
          {uz.noAccess.toCatalog}
        </Link>
      </div>
    </div>
  );
}
