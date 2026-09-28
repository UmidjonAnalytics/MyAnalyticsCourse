import "server-only";
import type { Json } from "@/lib/database.types";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

// Shared helpers for admin Server Actions. Every action checks the admin role itself
// (never rely on the proxy alone); RLS checks it a third time in the database.

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };
export type FormState = { status: "idle" } | { status: "saved"; message?: string } | { status: "error"; error: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function adminContext(): Promise<{ supabase: Supabase; userId: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin === true ? { supabase, userId } : null;
}

export async function audit(
  supabase: Supabase,
  actorId: string,
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, Json | undefined> = {},
) {
  const { error } = await supabase
    .from("audit_log")
    .insert({ actor_id: actorId, action, entity, entity_id: entityId, details: details as Json });
  if (error) console.error("audit log failed", error.message);
}

/** Uzbek message for a database error. */
export function dbErrorMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return uz.admin.errors.generic;
  if (error.code === "23505") return uz.admin.errors.slugTaken;
  const m = error.message ?? "";
  if (m.includes("paid_content")) return uz.admin.errors.paidContent;
  if (m.includes("not_archived")) return uz.admin.errors.notArchived;
  if (m.includes("self_demote")) return uz.admin.errors.selfDemote;
  if (m.includes("forbidden")) return uz.admin.errors.forbidden;
  return uz.admin.errors.generic;
}

export const forbidden: ActionResult = { ok: false, error: uz.admin.errors.forbidden };
