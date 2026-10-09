"use client";

import { useState } from "react";
import { Check, Copy, Printer, Send } from "lucide-react";
import { LinkedInIcon } from "@/components/BrandIcons";
import { uz } from "@/lib/i18n/uz";

const t = uz.certificate;

export function CertificateActions({
  url,
  code,
  courseTitle,
  issuedAt,
  owner,
}: {
  url: string;
  code: string;
  courseTitle: string;
  issuedAt: string;
  /** Share buttons are shown only to the student who earned it. */
  owner: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const issued = new Date(issuedAt);
  const linkedin =
    "https://www.linkedin.com/profile/add?" +
    new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: courseTitle,
      organizationName: uz.brand.name,
      issueYear: String(issued.getFullYear()),
      issueMonth: String(issued.getMonth() + 1),
      certUrl: url,
      certId: code,
    }).toString();
  const linkedinPost = `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url }).toString()}`;
  const telegram = `https://t.me/share/url?${new URLSearchParams({ url, text: t.shareText(courseTitle) }).toString()}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: the address bar still has the link
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn-primary" onClick={() => window.print()} title={t.printHint}>
        <Printer className="size-4" aria-hidden="true" />
        {t.print}
      </button>
      {owner ? (
        <>
          <a href={linkedin} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <LinkedInIcon />
            {t.linkedin}
          </a>
          <a href={linkedinPost} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <LinkedInIcon />
            {t.linkedinPost}
          </a>
          <a href={telegram} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <Send className="size-4" aria-hidden="true" />
            {t.telegram}
          </a>
        </>
      ) : null}
      <button type="button" className="btn-ghost" onClick={copy}>
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        <span aria-live="polite">{copied ? t.copied : t.copy}</span>
      </button>
    </div>
  );
}
