"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { uz } from "@/lib/i18n/uz";

// Read-only link with a copy button.
export function CopyLink({ id, label, value }: { id: string; label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex gap-2">
        <input id={id} readOnly value={value} className="input min-w-0 flex-1 font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              document.getElementById(id)?.focus();
            }
          }}
        >
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          <span aria-live="polite">{copied ? uz.referral.copied : uz.referral.copy}</span>
        </button>
      </div>
    </div>
  );
}
