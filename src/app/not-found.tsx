import Link from "next/link";
import { uz } from "@/lib/i18n/uz";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="card max-w-md space-y-4 p-8 text-center">
        <p className="font-display text-5xl font-extrabold text-accent-text">404</p>
        <h1 className="text-2xl font-bold">{uz.notFound.title}</h1>
        <p className="text-muted">{uz.notFound.description}</p>
        <Link href="/" className="btn-primary">
          {uz.common.backHome}
        </Link>
      </div>
    </main>
  );
}
