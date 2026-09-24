import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { uz } from "@/lib/i18n/uz";

export const metadata: Metadata = { title: uz.access.none };

export default function NoAccessPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="card max-w-md space-y-4 p-8 text-center">
        <Lock aria-hidden className="mx-auto size-10 text-accent-text" />
        <h1 className="text-2xl font-bold">{uz.access.title}</h1>
        <p className="text-muted">{uz.access.noneDescription}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a href={uz.access.contactUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
            {uz.access.contact}
          </a>
          <Link href="/learn" className="btn-secondary">
            {uz.common.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
}
