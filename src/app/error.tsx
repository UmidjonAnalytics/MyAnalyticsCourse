"use client";

import Link from "next/link";
import { useEffect } from "react";
import { uz } from "@/lib/i18n/uz";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">{uz.errorPage.title}</h1>
      <p className="mt-2 text-muted">{uz.errorPage.text}</p>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" className="btn-primary" onClick={reset}>
          {uz.common.retry}
        </button>
        <Link href="/" className="btn-secondary">
          {uz.common.home}
        </Link>
      </div>
    </main>
  );
}
