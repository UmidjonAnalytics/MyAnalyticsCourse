"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Monitor } from "lucide-react";
import { Notice } from "@/components/Notice";
import { postJson } from "@/lib/api/client";
import { uz } from "@/lib/i18n/uz";

export type DeviceItem = { id: string; label: string; lastSeen: string; current: boolean };

export function DeviceList({ devices }: { devices: DeviceItem[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revoke(id: string) {
    if (!window.confirm(uz.profile.signOutDeviceConfirm)) return;
    setError(null);
    setPending(id);
    const res = await postJson("/api/devices/revoke", { id });
    setPending(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  if (devices.length === 0) return <p className="text-sm text-muted">{uz.profile.devicesEmpty}</p>;

  return (
    <div>
      <ul className="divide-y divide-border">
        {devices.map((d) => (
          <li key={d.id} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-3">
              <Monitor className="size-5 text-muted" aria-hidden="true" />
              <span>
                <span className="block font-semibold">
                  {d.label}
                  {d.current ? (
                    <span className="ml-2 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
                      {uz.profile.thisDevice}
                    </span>
                  ) : null}
                </span>
                <span className="text-sm text-muted">{uz.profile.lastSeen(d.lastSeen)}</span>
              </span>
            </span>
            {!d.current ? (
              <button type="button" className="btn-danger" onClick={() => void revoke(d.id)} disabled={pending !== null}>
                {pending === d.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {uz.profile.signOutDevice}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
    </div>
  );
}
