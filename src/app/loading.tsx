import { Loader2 } from "lucide-react";
import { uz } from "@/lib/i18n/uz";

export default function Loading() {
  return (
    <div role="status" className="grid min-h-dvh place-items-center text-muted">
      <span className="flex items-center gap-2">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        {uz.common.loading}
      </span>
    </div>
  );
}
