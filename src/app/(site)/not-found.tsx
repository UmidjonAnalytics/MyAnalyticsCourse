import Link from "next/link";
import { uz } from "@/lib/i18n/uz";

// Inside the site layout (header + footer already shown), so no extra header here.
export default function SiteNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-mono text-sm font-semibold text-accent-text">404</p>
      <h1 className="mt-2 text-3xl font-bold">{uz.notFound.title}</h1>
      <p className="mt-2 text-muted">{uz.notFound.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          {uz.common.home}
        </Link>
        <Link href="/#kurslar" className="btn-secondary">
          {uz.nav.catalog}
        </Link>
      </div>
    </div>
  );
}
