"use client";

import { useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Tiny notification system for the admin panel: toast("Saqlandi") / toast(message, "error").
type Toast = { id: number; message: string; tone: "success" | "error" };
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  for (const l of listeners) l();
}

export function toast(message: string, tone: Toast["tone"] = "success") {
  const id = nextId++;
  toasts = [...toasts, { id, message, tone }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, tone === "error" ? 7000 : 3500);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const empty: Toast[] = [];

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => empty);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            t.tone === "error" ? "border-danger bg-danger-soft" : "border-border bg-surface"
          }`}
        >
          {t.tone === "error" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden="true" />
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
