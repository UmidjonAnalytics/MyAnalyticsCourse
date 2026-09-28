"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { uz } from "@/lib/i18n/uz";

// While the provider's confirmation has not arrived, re-check every 3 seconds (up to 3 minutes).
export function PendingRefresher() {
  const router = useRouter();
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (ticks >= 60) return;
    const t = setTimeout(() => {
      setTicks((n) => n + 1);
      router.refresh();
    }, 3000);
    return () => clearTimeout(t);
  }, [ticks, router]);
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 text-center">
      <Loader2 className="size-8 animate-spin text-accent-text" aria-hidden="true" />
      <p className="text-lg font-bold">{uz.result.pending}</p>
      <p className="text-sm text-muted">{ticks >= 60 ? uz.result.pendingLong : uz.result.pendingText}</p>
    </div>
  );
}
