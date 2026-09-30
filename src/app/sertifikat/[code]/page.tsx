import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { CertificateActions } from "@/components/course/CertificateActions";
import { Logo, LogoMark } from "@/components/Logo";
import { formatDate } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

// Public verification page for a certificate. Prints as one A4 landscape page.

type Params = Promise<{ code: string }>;
const t = uz.certificate;

async function load(code: string) {
  if (!/^[A-Za-z0-9]{6,20}$/.test(code)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("certificate_public", { p_code: code });
  return data?.[0] ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  const cert = await load(code);
  if (!cert) return { title: t.notFoundTitle, robots: { index: false } };
  const title = `${cert.full_name} · ${cert.course_title}`;
  return { title, description: `${t.title}: ${cert.course_title}`, openGraph: { title, description: t.title } };
}

export default async function CertificatePage({ params }: { params: Params }) {
  const { code } = await params;
  const cert = await load(code);

  if (!cert) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 text-center">
        <LogoMark className="size-12" />
        <h1 className="mt-6 text-2xl font-bold">{t.notFoundTitle}</h1>
        <p className="mt-2 text-muted">{t.notFoundText}</p>
        <Link href="/" className="btn-primary mt-6">
          {uz.brand.name}
        </Link>
      </main>
    );
  }

  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}/sertifikat/${cert.code}`;
  const supabase = await createClient();
  const { data: own } = await supabase.from("certificates").select("id").eq("code", cert.code).maybeSingle();

  return (
    <div className="min-h-dvh">
      {/* Fixed page size for printing; the certificate itself scales with its width (cqw). */}
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .cert { width: 297mm !important; max-width: none !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <p className="flex items-center gap-2 text-sm font-semibold text-accent-text">
            <BadgeCheck className="size-5" aria-hidden="true" />
            {t.valid}
          </p>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-6 print:p-0">
        <div className="mb-5 print:hidden">
          <CertificateActions url={url} code={cert.code} courseTitle={cert.course_title} issuedAt={cert.issued_at} owner={Boolean(own)} />
          <p className="mt-2 text-xs text-muted">{t.printHint}</p>
        </div>

        {/* A paper document: fixed light colours in both themes. */}
        <article
          className="cert relative mx-auto aspect-[297/210] w-full overflow-hidden rounded-xl bg-white text-[#1b1f23] shadow-lg [container-type:inline-size]"
          aria-label={t.title}
        >
          <div className="absolute inset-[2.2cqw] rounded-[0.6cqw] border-[0.25cqw] border-[#0b6e4f]" aria-hidden="true" />
          <div className="absolute inset-[3cqw] rounded-[0.4cqw] border-[0.08cqw] border-[#0b6e4f]/40" aria-hidden="true" />
          <div className="relative flex h-full flex-col items-center px-[9cqw] pt-[6.5cqw] pb-[5cqw] text-center">
            <div className="flex items-center gap-[1cqw]">
              <LogoMark className="size-[4.2cqw]" />
              <span className="font-display font-bold" style={{ fontSize: "2.1cqw" }}>
                {uz.brand.name}
              </span>
            </div>
            <p className="mt-[3cqw] font-display font-bold uppercase tracking-[0.35em] text-[#0b6e4f]" style={{ fontSize: "3.4cqw" }}>
              {t.heading}
            </p>
            <p className="mt-[2.2cqw] text-[#565c63]" style={{ fontSize: "1.6cqw" }}>
              {t.certifies}
            </p>
            <p className="mt-[1.2cqw] font-display font-bold leading-tight" style={{ fontSize: "5cqw" }}>
              {cert.full_name}
            </p>
            <div className="mt-[1cqw] h-[0.15cqw] w-[40cqw] bg-[#0b6e4f]/50" aria-hidden="true" />
            <p className="mt-[1.6cqw] text-[#565c63]" style={{ fontSize: "1.6cqw" }}>
              {t.completed}
            </p>
            <p className="mt-[1cqw] font-display font-bold" style={{ fontSize: "3cqw" }}>
              {cert.course_title}
            </p>
            {Number(cert.hours) >= 1 ? (
              <p className="mt-[0.8cqw] text-[#565c63]" style={{ fontSize: "1.5cqw" }}>
                {t.hours(Number(cert.hours))}
              </p>
            ) : null}

            <div className="mt-auto grid w-full grid-cols-3 items-end gap-[3cqw]" style={{ fontSize: "1.3cqw" }}>
              <div className="text-left">
                <p className="text-[#565c63]">{t.issued}</p>
                <p className="font-semibold">{formatDate(cert.issued_at)}</p>
              </div>
              <div>
                {cert.instructor_name ? (
                  <>
                    <p className="border-t-[0.1cqw] border-[#1b1f23] pt-[0.6cqw] font-semibold">{cert.instructor_name}</p>
                    <p className="text-[#565c63]">{cert.instructor_title || t.instructor}</p>
                  </>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-[#565c63]">{t.code}</p>
                <p className="font-mono font-semibold">{cert.code}</p>
                <p className="mt-[0.4cqw] break-all text-[#565c63]" style={{ fontSize: "1cqw" }}>
                  {url.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </div>
          </div>
        </article>

        <p className="mt-6 text-center text-sm text-muted print:hidden">
          <Link href={`/kurs/${cert.course_slug}`} className="font-semibold text-accent-text hover:underline">
            {cert.course_title}
          </Link>
        </p>
      </main>
    </div>
  );
}
