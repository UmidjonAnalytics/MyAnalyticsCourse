import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { uz } from "@/lib/i18n/uz";

export const metadata: Metadata = { title: uz.noAccess.title };

export default function NoAccessPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <Lock className="mx-auto size-10 text-muted" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold">{uz.noAccess.title}</h1>
      <p className="mt-2 text-muted">{uz.noAccess.text}</p>
      <Link href="/" className="btn-primary mt-8">
        {uz.noAccess.toCatalog}
      </Link>
    </div>
  );
}
