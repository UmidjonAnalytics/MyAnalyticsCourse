"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { uz } from "@/lib/i18n/uz";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    // storage blocked: theme still applies for this visit
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);

  return (
    <div role="radiogroup" aria-label={uz.profile.theme} className="inline-flex rounded-lg border border-border-strong p-1">
      {(
        [
          ["light", uz.profile.themeLight, Sun],
          ["dark", uz.profile.themeDark, Moon],
        ] as const
      ).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => applyTheme(value)}
          className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
            theme === value ? "bg-accent text-accent-fg" : "text-text hover:bg-surface-muted"
          }`}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
