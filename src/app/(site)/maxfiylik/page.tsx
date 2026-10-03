import { LegalPage, legalMetadata } from "@/components/site/LegalPage";

export const generateMetadata = () => legalMetadata("maxfiylik");

export default function PrivacyPage() {
  return <LegalPage slug="maxfiylik" />;
}
