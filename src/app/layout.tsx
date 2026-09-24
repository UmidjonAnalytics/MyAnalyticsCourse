import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Manrope } from "next/font/google";
import { uz } from "@/lib/i18n/uz";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-bricolage" });
const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope" });
const jetbrains = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: uz.brand.name, template: `%s · ${uz.brand.name}` },
  description: uz.brand.tagline,
};

// Light by default; applies a saved theme before the page paints (no flash of the wrong theme).
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="dark"){t="light"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="uz"
      className={`${bricolage.variable} ${manrope.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
