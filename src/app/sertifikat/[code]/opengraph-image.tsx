import { ImageResponse } from "next/og";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";

// Preview picture shown when a certificate link is shared (LinkedIn, Telegram, Facebook).

export const alt = uz.certificate.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CertificateImage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = /^[A-Za-z0-9]{6,20}$/.test(code) ? await supabase.rpc("certificate_public", { p_code: code }) : { data: null };
  const cert = data?.[0] ?? null;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#f5f3ee", padding: 36 }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          border: "6px solid #0b6e4f",
          borderRadius: 24,
          padding: 48,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700, color: "#1d2125" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "#0b6e4f",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 6,
              padding: 12,
            }}
          >
            <div style={{ width: 6, height: 14, background: "#fff", borderRadius: 3 }} />
            <div style={{ width: 6, height: 26, background: "#fff", borderRadius: 3 }} />
            <div style={{ width: 6, height: 20, background: "#fff", borderRadius: 3 }} />
          </div>
          {uz.brand.name}
        </div>
        <div style={{ marginTop: 36, fontSize: 30, letterSpacing: 12, fontWeight: 700, color: "#0b6e4f" }}>{uz.certificate.heading.toUpperCase()}</div>
        <div style={{ marginTop: 28, fontSize: cert && cert.full_name.length > 24 ? 60 : 76, fontWeight: 700, color: "#1d2125" }}>
          {cert ? cert.full_name : uz.certificate.notFoundTitle}
        </div>
        {cert ? <div style={{ marginTop: 20, fontSize: 36, color: "#565c63" }}>{cert.course_title}</div> : null}
        {cert ? <div style={{ marginTop: 40, fontSize: 22, color: "#565c63" }}>{`${uz.certificate.code}: ${cert.code}`}</div> : null}
      </div>
    </div>,
    size,
  );
}
