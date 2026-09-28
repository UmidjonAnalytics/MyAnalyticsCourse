import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import type { Json } from "@/lib/database.types";
import { runChecks, type CheckRule, type ResultSet } from "@/lib/practice/checker";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// "Tekshirish": the browser sends its query result; we compare it with the stored expected
// result (which never leaves the server) and return pass/fail per check with hints.
const cell = z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]);
const body = z.object({
  sql: z.string().min(1).max(20_000),
  columns: z.array(z.string().max(200)).max(100),
  rows: z.array(z.array(cell).max(100)).max(5000),
});

const ruleSchema = z.array(
  z.discriminatedUnion("type", [
    z.object({ id: z.string(), type: z.literal("row_count"), label: z.string().optional(), hint: z.string().optional() }),
    z.object({ id: z.string(), type: z.literal("columns"), label: z.string().optional(), hint: z.string().optional(), ordered: z.boolean().optional() }),
    z.object({
      id: z.string(),
      type: z.literal("rows"),
      label: z.string().optional(),
      hint: z.string().optional(),
      ordered: z.boolean().optional(),
      tolerance: z.number().optional(),
    }),
    z.object({
      id: z.string(),
      type: z.literal("column_sum"),
      label: z.string().optional(),
      hint: z.string().optional(),
      column: z.string(),
      tolerance: z.number().optional(),
    }),
  ]),
);
const expectedSchema = z.object({ columns: z.array(z.string()), rows: z.array(z.array(cell)) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiError(400, "validation_failed");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "validation_failed");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return apiError(401, "not_logged_in");
  if (!(await rateLimit(`exercise-check:${userId}`, 30, 60))) return apiError(429, "rate_limited");

  // RLS: visible only if the student can open this exercise.
  const { data: exercise } = await supabase.from("exercises").select("id, points").eq("id", id).maybeSingle();
  if (!exercise) return apiError(403, "forbidden");

  const admin = createAdminClient();
  const { data: key } = await admin.from("exercise_keys").select("expected, check_rules").eq("exercise_id", id).maybeSingle();
  const expected = expectedSchema.safeParse(key?.expected);
  const rules = ruleSchema.safeParse(key?.check_rules);
  if (!expected.success || !rules.success || rules.data.length === 0) return apiError(409, "exercise_not_ready");

  const student: ResultSet = { columns: parsed.data.columns, rows: parsed.data.rows };
  const results = runChecks(student, expected.data, rules.data as CheckRule[]);
  const passed = results.every((r) => r.passed);
  const score = passed ? exercise.points : 0;

  const { error } = await admin.from("exercise_submissions").insert({
    user_id: userId,
    exercise_id: id,
    sql: parsed.data.sql,
    passed,
    score,
    results: results as unknown as Json,
  });
  if (error) console.error("submission insert failed", error.message);

  return apiOk({ passed, score, results });
}
