// Challenge timing helpers (shared by public and admin pages).
export type ChallengeStatus = "upcoming" | "active" | "ended";

export function challengeStatus(c: { starts_at: string; ends_at: string }, now = Date.now()): ChallengeStatus {
  if (now < new Date(c.starts_at).getTime()) return "upcoming";
  if (now > new Date(c.ends_at).getTime()) return "ended";
  return "active";
}

export function daysLeft(endsAt: string, now = Date.now()): number {
  return Math.floor((new Date(endsAt).getTime() - now) / 86_400_000);
}
