"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Laptop, Loader2 } from "lucide-react";
import { uz } from "@/lib/i18n/uz";
import { deviceName, formatDateTime } from "@/lib/format";

export type DeviceItem = {
  id: string;
  userAgent: string | null;
  lastSeenAt: string;
  isCurrent: boolean;
};

export function DeviceList({ devices }: { devices: DeviceItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revoke(id: string) {
    if (!window.confirm(uz.devices.logoutConfirm)) return;
    setBusyId(id);
    setError(null);
    const res = await fetch("/api/devices/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json().catch(() => ({}))) as { signedOut?: boolean; error?: string };
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? uz.errors.generic);
      return;
    }
    if (data.signedOut) {
      router.replace("/");
    }
    router.refresh();
  }

  if (devices.length === 0) return <p className="text-sm text-muted">{uz.devices.empty}</p>;

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {devices.map((d) => (
          <li key={d.id} className="flex items-center gap-3 p-3">
            <Laptop aria-hidden className="size-5 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {deviceName(d.userAgent, uz.devices.unknown)}
                {d.isCurrent && (
                  <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
                    {uz.devices.thisDevice}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted">
                {uz.devices.lastSeen}: {formatDateTime(d.lastSeenAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => revoke(d.id)}
              disabled={busyId !== null}
              className="btn-danger px-3"
            >
              {busyId === d.id ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              {uz.devices.logout}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
