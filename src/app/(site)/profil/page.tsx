import type { Metadata } from "next";
import { headers } from "next/headers";
import { Notice } from "@/components/Notice";
import { PublicProfileForm } from "@/components/profile/PublicProfileForm";
import { ProfileSections } from "@/components/profile/ProfileSections";
import { authErrorMessage } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";

export const metadata: Metadata = { title: uz.profile.title };

// Full-page profile (the same sections also open in the right panel from the avatar).
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ xato?: string }> }) {
  const { xato } = await searchParams;
  const user = await requireUser("/profil");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const p = user.profile;
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:py-12">
      <h1 className="sr-only">{uz.profile.title}</h1>
      {xato ? <Notice tone="error">{authErrorMessage(xato)}</Notice> : null}
      <ProfileSections />
      <PublicProfileForm
        origin={origin}
        initial={{
          is_public: p?.is_public ?? false,
          username: p?.username ?? "",
          headline: p?.headline ?? "",
          location: p?.location ?? "",
          bio: p?.bio ?? "",
          linkedin_url: p?.linkedin_url ?? "",
          github_url: p?.github_url ?? "",
          website_url: p?.website_url ?? "",
        }}
      />
    </div>
  );
}
