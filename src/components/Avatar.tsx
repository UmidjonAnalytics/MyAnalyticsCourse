import { initials } from "@/lib/format";

export function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (photoUrl) {
    // Telegram avatars come from t.me; a plain <img> avoids proxying them through our server.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" style={style} className="rounded-full object-cover" referrerPolicy="no-referrer" />;
  }
  return (
    <span
      aria-hidden
      style={style}
      className="grid place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent-text"
    >
      {initials(name)}
    </span>
  );
}
