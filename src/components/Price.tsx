import { formatSom } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { timeLeft, type CurrentPrice } from "@/lib/pricing";

// Price with an optional sale: new price, old price struck through, "−20%" badge and time left.
export function Price({ value, size = "md", showEnds = false }: { value: CurrentPrice; size?: "sm" | "md" | "lg"; showEnds?: boolean }) {
  const cls = size === "lg" ? "font-display text-3xl font-bold" : size === "md" ? "font-display text-lg font-bold leading-tight" : "font-bold";
  if (value.was === null) return <span className={cls}>{formatSom(value.price)}</span>;
  const left = value.endsAt ? timeLeft(value.endsAt) : null;
  return (
    <span className="inline-flex flex-col">
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className={cls}>{formatSom(value.price)}</span>
        <s className={`text-muted ${size === "lg" ? "text-base" : "text-xs"}`}>
          <span className="sr-only">{uz.sale.was}: </span>
          {formatSom(value.was)}
        </s>
        <span className="rounded-md bg-star/20 px-1.5 py-0.5 text-xs font-bold text-text">{uz.sale.badge(value.percent)}</span>
      </span>
      {showEnds && left ? <span className="mt-1 text-xs font-semibold text-accent-text">{uz.sale.endsIn(left.days, left.hours)}</span> : null}
    </span>
  );
}
