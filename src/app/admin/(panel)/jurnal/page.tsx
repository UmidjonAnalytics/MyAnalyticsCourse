import type { Metadata } from "next";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: uz.admin.audit.title };

export default async function AuditLog() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, entity, entity_id, details, created_at, profiles(full_name, phone)")
    .order("created_at", { ascending: false })
    .limit(200);
  const t = uz.admin.audit;
  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-muted">{t.lead}</p>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">{t.when}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t.who}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t.action}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t.entity}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t.details}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(data ?? []).map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-muted">{formatDateTime(row.created_at)}</td>
                <td className="px-4 py-2">{row.profiles?.full_name || row.profiles?.phone || "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{row.action}</td>
                <td className="px-4 py-2 font-mono text-xs">{row.entity}</td>
                <td className="max-w-md truncate px-4 py-2 font-mono text-xs text-muted" title={JSON.stringify(row.details)}>
                  {JSON.stringify(row.details)}
                </td>
              </tr>
            ))}
            {!data?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted">
                  {uz.admin.common.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
