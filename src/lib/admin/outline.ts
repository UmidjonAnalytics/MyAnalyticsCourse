// Course outline pasted as text -> modules and lessons (used by the admin "Rejadan qo'shish" page,
// in the browser for the preview and again on the server before saving).
//
//   # 1-modul: Kirish                         <- a line starting with # is a module
//   Excel nima? | https://youtu.be/abc | 8     <- every other line is a lesson; video and minutes are optional
//   Interfeys bilan tanishuv	12              <- columns copied from Excel / Google Sheets (tabs) work too

import { slugify } from "@/lib/slug";
import { youtubeId } from "@/lib/youtube";

export type OutlineLessonDraft = { title: string; slug: string; youtube: string | null; minutes: number | null; line: number };
export type OutlineModuleDraft = { title: string; line: number; lessons: OutlineLessonDraft[] };
export type OutlineProblem = { line: number; kind: "noModule" | "badVideo" | "badMinutes" | "tooLong" | "emptyModule" | "tooMany" };
export type ParsedOutline = { modules: OutlineModuleDraft[]; problems: OutlineProblem[]; lessonCount: number; videoCount: number };

export const OUTLINE_LIMITS = { modules: 50, lessons: 300, title: 200 };

/** "12", "12 daq", "12 min", "12:30" (mm:ss), "1:02:10" (h:mm:ss) -> whole minutes (rounded up). */
export function parseMinutes(raw: string): number | null {
  const v = raw.trim().toLowerCase();
  let m = v.match(/^(\d{1,3})\s*(daq|daqiqa|min|m)?\.?$/);
  if (m) return Number(m[1]);
  m = v.match(/^(\d{1,3}):([0-5]\d)$/);
  if (m) return Number(m[1]) + (Number(m[2]) > 0 ? 1 : 0);
  m = v.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]) + (Number(m[3]) > 0 ? 1 : 0);
  return null;
}

// "- Title", "* Title", "• Title", "1. Title", "1) Title" -> "Title". "1-dars: Title" is kept as written.
const BULLET = /^(?:[-*•–]\s+|\d{1,3}[.)]\s+)/;

export function parseOutline(text: string): ParsedOutline {
  const modules: OutlineModuleDraft[] = [];
  const problems: OutlineProblem[] = [];
  let lessonCount = 0;
  let videoCount = 0;

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = i + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("#")) {
      const title = trimmed.replace(/^#+/, "").trim();
      if (!title) return;
      if (title.length > OUTLINE_LIMITS.title) problems.push({ line, kind: "tooLong" });
      modules.push({ title: title.slice(0, OUTLINE_LIMITS.title), line, lessons: [] });
      return;
    }

    const parts = trimmed
      .split(/\s*[|\t]\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    const title = (parts.shift() ?? "").replace(BULLET, "").trim();
    if (!title) return;

    let youtube: string | null = null;
    let minutes: number | null = null;
    for (const part of parts) {
      if (/^(https?:\/\/|www\.|youtu)/i.test(part)) {
        if (youtubeId(part)) youtube = part;
        else problems.push({ line, kind: "badVideo" });
      } else {
        const n = parseMinutes(part);
        if (n === null || n > 600) problems.push({ line, kind: "badMinutes" });
        else minutes = n;
      }
    }

    const current = modules.at(-1);
    if (!current) {
      problems.push({ line, kind: "noModule" });
      return;
    }
    if (title.length > OUTLINE_LIMITS.title) problems.push({ line, kind: "tooLong" });
    current.lessons.push({ title: title.slice(0, OUTLINE_LIMITS.title), slug: slugify(title) || "dars", youtube, minutes, line });
    lessonCount += 1;
    if (youtube) videoCount += 1;
  });

  for (const m of modules) if (m.lessons.length === 0) problems.push({ line: m.line, kind: "emptyModule" });
  if (modules.length > OUTLINE_LIMITS.modules || lessonCount > OUTLINE_LIMITS.lessons) problems.push({ line: 0, kind: "tooMany" });
  problems.sort((a, b) => a.line - b.line);
  return { modules, problems, lessonCount, videoCount };
}
