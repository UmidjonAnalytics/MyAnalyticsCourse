/* eslint-disable @next/next/no-img-element -- avatars come from Google/Apple; plain <img> keeps hosting portable */

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (url) {
    return <img src={url} alt="" style={style} className="rounded-full object-cover" referrerPolicy="no-referrer" />;
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.38 }}
      className="inline-flex items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-text"
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
