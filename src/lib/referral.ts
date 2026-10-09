// Invite links: dataexpert.uz/taklif/ABC1234 stores the code in this cookie for 30 days;
// checkout reads it (server only) and gives the friend's first purchase a discount.
export const REFERRAL_COOKIE = "de_taklif";
export const REFERRAL_COOKIE_DAYS = 30;
export const REFERRAL_CODE = /^[A-Z0-9]{6,12}$/;

export type RewardStatus = "active" | "used" | "expired" | "revoked";

export function rewardStatus(r: { used: boolean | null; revoked: boolean; valid_to: string | null }, now = Date.now()): RewardStatus {
  if (r.revoked) return "revoked";
  if (r.used) return "used";
  if (r.valid_to && new Date(r.valid_to).getTime() < now) return "expired";
  return "active";
}
