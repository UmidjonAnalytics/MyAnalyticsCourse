import { LegalPage, legalMetadata } from "@/components/site/LegalPage";

export const generateMetadata = () => legalMetadata("qaytarish");

export default function RefundsPage() {
  return <LegalPage slug="qaytarish" />;
}
