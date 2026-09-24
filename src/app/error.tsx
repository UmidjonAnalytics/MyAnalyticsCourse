"use client";

import { uz } from "@/lib/i18n/uz";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div role="alert" className="card max-w-md space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold">{uz.common.error}</h1>
        <p className="text-muted">{uz.errors.generic}</p>
        <button type="button" onClick={reset} className="btn-primary">
          {uz.common.tryAgain}
        </button>
      </div>
    </main>
  );
}
