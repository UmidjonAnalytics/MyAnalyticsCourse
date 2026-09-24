import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Tone = "info" | "error" | "success";

const styles: Record<Tone, string> = {
  info: "bg-warning-soft text-text",
  error: "bg-danger-soft text-text",
  success: "bg-accent-soft text-text",
};

export function Notice({ tone = "info", children }: { tone?: Tone; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-2.5 rounded-lg px-3.5 py-3 text-sm ${styles[tone]}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone === "error" ? "text-danger" : "text-accent-text"}`} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
