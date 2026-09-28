"use client";

import { useId } from "react";
import { uz } from "@/lib/i18n/uz";

// Plain, accessible SQL editor: monospace textarea, Tab inserts spaces, Ctrl/Cmd+Enter runs.
export function SqlEditor({
  value,
  onChange,
  onRun,
  label = uz.practice.editor,
  rows = 8,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  label?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={uz.practice.placeholder}
        aria-describedby={`${id}-h`}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            onRun();
            return;
          }
          if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            const el = e.currentTarget;
            const { selectionStart: s, selectionEnd: end } = el;
            const next = `${value.slice(0, s)}  ${value.slice(end)}`;
            onChange(next);
            requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
          }
        }}
        className="w-full rounded-lg border border-border-strong bg-[#1b1f23] p-3 font-mono text-sm leading-relaxed text-[#e8e6e1] placeholder:text-[#8a9097]"
      />
      <p id={`${id}-h`} className="mt-1 text-xs text-muted">
        {uz.practice.editorHint}
      </p>
    </div>
  );
}
