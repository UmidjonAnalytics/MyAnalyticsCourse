import { Gift, Send } from "lucide-react";
import { CopyLink } from "@/components/referral/CopyLink";
import { getSiteSettings, siteOrigin } from "@/lib/data/site";
import { formatDate } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";
import { rewardStatus } from "@/lib/referral";
import { createClient } from "@/lib/supabase/server";

// "Do'stlarni taklif qiling": the student's invite link and the discount codes they earned.
export async function InviteCard() {
  const site = await getSiteSettings();
  if (!site.referral_enabled) return null;
  const supabase = await createClient();
  const [{ data: code }, { data: rewards }, origin] = await Promise.all([
    supabase.rpc("my_referral_code"),
    supabase.rpc("my_referral_rewards"),
    siteOrigin(),
  ]);
  if (!code) return null;

  const t = uz.referral;
  const link = `${origin}/taklif/${code}`;
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t.shareText)}`;
  const list = rewards ?? [];

  return (
    <section aria-labelledby="invite-title" className="card mt-10 p-5 sm:p-6">
      <h2 id="invite-title" className="flex items-center gap-2 text-xl font-bold">
        <Gift className="size-5 text-accent-text" aria-hidden="true" />
        {t.title}
      </h2>
      <p className="mt-1 text-muted">{t.lead(site.referral_friend_percent, site.referral_reward_percent)}</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <CopyLink id="invite-link" label={t.link} value={link} />
        </div>
        <a href={telegram} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          <Send className="size-4" aria-hidden="true" />
          {t.telegram}
        </a>
      </div>
      <p className="mt-4 text-sm font-semibold">{t.friends(list.length)}</p>
      {list.length > 0 ? (
        <div className="mt-3">
          <h3 className="text-sm font-bold">{t.rewards}</h3>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {list.map((r, i) => {
              const s = rewardStatus(r);
              return (
                <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
                  <span className="font-mono font-bold">{r.code}</span>
                  <span>{t.rewardLine(r.percent ?? 0)}</span>
                  {r.valid_to && s === "active" ? <span className="text-muted">{t.validTo(formatDate(r.valid_to))}</span> : null}
                  <span
                    className={`ml-auto rounded-md px-2 py-0.5 text-xs font-semibold ${s === "active" ? "bg-accent-soft text-accent-text" : "bg-surface-muted text-muted"}`}
                  >
                    {t.status[s]}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">{t.howToUse}</p>
        </div>
      ) : null}
    </section>
  );
}
