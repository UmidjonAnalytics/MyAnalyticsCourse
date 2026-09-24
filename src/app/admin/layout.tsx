import type { Metadata } from "next";
import { uz } from "@/lib/i18n/uz";

// Everything under /admin is served only on the admin host (see src/proxy.ts).
export const metadata: Metadata = {
  title: { default: uz.brand.adminName, template: `%s | ${uz.brand.adminName}` },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
