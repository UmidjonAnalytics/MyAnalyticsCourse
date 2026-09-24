import type { MetadataRoute } from "next";

// Student site. (The admin host gets "Disallow: /" from the proxy.)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/profil", "/kirish", "/mening-kurslarim", "/dars", "/tolov"] },
  };
}
