import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, CircleDashed, Eye } from "lucide-react";
import { launchChecks, type CheckStatus } from "@/lib/admin/readiness";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.readiness.title };
export const dynamic = "force-dynamic";

const t = uz.admin.readiness;
const look: Record<CheckStatus, { Icon: typeof CheckCircle2; cls: string; label: string }> = {
  ok: { Icon: CheckCircle2, cls: "text-accent-text", label: t.ok },
  todo: { Icon: CircleDashed, cls: "text-muted", label: t.todo },
  warn: { Icon: AlertTriangle, cls: "text-danger", label: t.warn },
  manual: { Icon: Eye, cls: "text-muted", label: t.manual },
};

export default async function ReadinessPage() {
  const checks = await launchChecks(await createClient());
  const done = checks.filter((c) => c.status === "ok").length;
  const groups = [...new Set(checks.map((c) => c.group))];
  // Warnings (test login / test payments still on) first inside each group.
  const rank: Record<CheckStatus, number> = { warn: 0, todo: 1, manual: 2, ok: 3 };
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>
      <div className="card mt-6 p-5">
        <p className="font-semibold">{t.done(done, checks.length)}</p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={checks.length}
          aria-label={t.title}
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((done / checks.length) * 100)}%` }} />
        </div>
      </div>
      <div className="mt-6 space-y-6">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`} className="text-lg font-bold">
              {t.groups[g]}
            </h2>
            <ul className="card mt-3 divide-y divide-border">
              {checks
                .filter((c) => c.group === g)
                .sort((a, b) => rank[a.status] - rank[b.status])
                .map((c) => {
                  const { Icon, cls, label } = look[c.status];
                  const item = t.items[c.id]!;
                  return (
                    <li key={c.id} className="flex gap-3 px-5 py-4">
                      <Icon className={`mt-0.5 size-5 shrink-0 ${cls}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {item.title} <span className={`ml-1 text-xs font-semibold ${cls}`}>· {label}</span>
                        </p>
                        {c.status !== "ok" ? <p className="mt-1 text-sm text-muted">{item.help}</p> : null}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
