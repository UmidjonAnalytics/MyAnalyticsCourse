// YouTube links: validation and privacy-friendly embed URLs (youtube-nocookie.com).

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Returns the 11-character video id from any common YouTube URL, or null. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const value = url.trim();
  if (ID.test(value)) return value;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      id = m?.[1] ?? null;
    }
  }
  return id && ID.test(id) ? id : null;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}
