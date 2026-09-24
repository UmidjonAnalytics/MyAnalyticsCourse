import Link from "next/link";
import { Logo } from "@/components/Logo";
import { uz } from "@/lib/i18n/uz";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Logo />
        </div>
      </header>
      <main className="mx-auto max-w-lg flex-1 px-4 py-20 text-center">
        <p className="font-mono text-sm font-semibold text-accent-text">404</p>
        <h1 className="mt-2 text-3xl font-bold">{uz.notFound.title}</h1>
        <p className="mt-2 text-muted">{uz.notFound.text}</p>
        <Link href="/" className="btn-primary mt-8">
          {uz.common.home}
        </Link>
      </main>
    </div>
  );
}
