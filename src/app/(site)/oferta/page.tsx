import { LegalPage, legalMetadata } from "@/components/site/LegalPage";

export const generateMetadata = () => legalMetadata("oferta");

export default function OfertaPage() {
  return <LegalPage slug="oferta" />;
}
