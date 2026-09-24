import { AlertTriangle, Info } from "lucide-react";

export function Notice({ tone = "info", children }: { tone?: "info" | "warning"; children: React.ReactNode }) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={`flex gap-3 rounded-xl border border-border p-4 text-sm ${
        tone === "warning" ? "bg-warning-soft" : "bg-accent-soft"
      }`}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
