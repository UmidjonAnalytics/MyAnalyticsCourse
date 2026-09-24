import { Loader2 } from "lucide-react";
import { uz } from "@/lib/i18n/uz";

export function Spinner({ label = uz.common.loading }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
