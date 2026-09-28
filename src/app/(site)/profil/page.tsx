import type { Metadata } from "next";
import { Notice } from "@/components/Notice";
import { ProfileSections } from "@/components/profile/ProfileSections";
import { authErrorMessage } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";

export const metadata: Metadata = { title: uz.profile.title };

// Full-page profile (the same sections also open in the right panel from the avatar).
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ xato?: string }> }) {
  const { xato } = await searchParams;
  await requireUser("/profil");
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:py-12">
      <h1 className="sr-only">{uz.profile.title}</h1>
      {xato ? <Notice tone="error">{authErrorMessage(xato)}</Notice> : null}
      <ProfileSections />
    </div>
  );
}
