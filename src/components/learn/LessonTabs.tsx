"use client";

import { useEffect, useRef, useState } from "react";
import { uz } from "@/lib/i18n/uz";

export type LessonTab = { id: string; label: string; count?: number; content: React.ReactNode };

// Accessible tabs (Tavsif / Amaliyot / Muhokama). A link with a hash (#muhokama) opens that tab.
export function LessonTabs({ tabs }: { tabs: LessonTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const ids = tabs.map((t) => t.id).join(",");

  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (ids.split(",").includes(id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [ids]);

  const select = (id: string, focus = false) => {
    setActive(id);
    if (focus) refs.current[id]?.focus();
  };

  const onKey = (e: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const to =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1) : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (to < 0) return;
    e.preventDefault();
    select(tabs[to]!.id, true);
  };

  return (
    <div>
      <div role="tablist" aria-label={uz.tabs.label} className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t, i) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${
                selected ? "border-accent text-accent-text" : "border-transparent text-muted hover:text-text"
              }`}
            >
              {t.label}
              {t.count !== undefined ? (
                <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? "bg-accent-soft" : "bg-surface-muted"}`}>{t.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={t.id !== active} tabIndex={0} className="pt-6 focus-visible:outline-none">
          {t.content}
        </div>
      ))}
    </div>
  );
}
