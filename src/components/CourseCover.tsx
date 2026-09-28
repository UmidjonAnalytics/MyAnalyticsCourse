/* eslint-disable @next/next/no-img-element -- covers come from Supabase Storage; plain <img> keeps hosting portable */
import { BarChart3, Code2, Database, Layers, Table2 } from "lucide-react";

// Cover image, or a calm placeholder tile with an icon for the category when no image is set.
function icon(label: string) {
  const l = label.toLowerCase();
  const props = { className: "size-12 text-accent-text", strokeWidth: 1.5 };
  if (l.includes("excel")) return <Table2 {...props} />;
  if (l.includes("power") || l.includes("bi")) return <BarChart3 {...props} />;
  if (l.includes("sql")) return <Database {...props} />;
  if (l.includes("python")) return <Code2 {...props} />;
  return <Layers {...props} />;
}

export function CourseCover({
  url,
  label,
  className = "",
}: {
  url: string | null;
  label: string;
  className?: string;
}) {
  if (url) {
    return <img src={url} alt="" loading="lazy" className={`aspect-[16/9] w-full object-cover ${className}`} />;
  }
  return (
    <div className={`flex aspect-[16/9] w-full items-center justify-center bg-accent-soft ${className}`} aria-hidden="true">
      {icon(label)}
    </div>
  );
}
