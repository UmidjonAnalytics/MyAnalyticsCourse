import Link from "next/link";
import { BarChart3, BookOpen, Briefcase, Clock, Layers } from "lucide-react";
import { CourseCover } from "@/components/CourseCover";
import type { PathCard, ProjectCard } from "@/lib/data/paths";
import { uz } from "@/lib/i18n/uz";

// Catalog cards for learning paths and portfolio projects (same look as course cards).

export function PathCardView({ p }: { p: PathCard }) {
  return (
    <li className="card group relative flex flex-col overflow-hidden">
      <CourseCover url={p.cover_url} label={p.title} />
      <div className="flex flex-1 flex-col p-5">
        {p.level ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <BarChart3 className="size-3.5" aria-hidden="true" />
            {uz.coursePage.levels[p.level]}
          </span>
        ) : null}
        <h3 className="mt-2 text-lg font-bold">
          <Link href={`/yol/${p.slug}`} className="after:absolute after:inset-0 group-hover:underline">
            {p.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm text-muted">{p.short_description}</p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <li className="inline-flex items-center gap-1.5">
            <Layers className="size-4" aria-hidden="true" />
            {uz.paths.courses(p.courseCount)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <BookOpen className="size-4" aria-hidden="true" />
            {uz.paths.lessons(p.lessonCount)}
          </li>
          {p.minutes > 0 ? (
            <li className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              {uz.paths.hours(p.minutes)}
            </li>
          ) : null}
          {p.projectCount > 0 ? (
            <li className="inline-flex items-center gap-1.5">
              <Briefcase className="size-4" aria-hidden="true" />
              {uz.paths.projects(p.projectCount)}
            </li>
          ) : null}
        </ul>
      </div>
    </li>
  );
}

export function ProjectCardView({ p }: { p: ProjectCard }) {
  return (
    <li className="card group relative flex flex-col overflow-hidden">
      <CourseCover url={p.cover_url} label={p.course?.title ?? p.title} />
      <div className="flex flex-1 flex-col p-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{p.course?.title}</span>
        <h3 className="mt-2 text-lg font-bold">
          <Link href={`/loyiha/${p.slug}`} className="after:absolute after:inset-0 group-hover:underline">
            {p.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm text-muted">{p.short_description}</p>
        {p.skills.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={uz.projects.skills}>
            {p.skills.slice(0, 4).map((s) => (
              <li key={s} className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold">
                {s}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {p.level ? (
            <span className="inline-flex items-center gap-1.5">
              <BarChart3 className="size-4" aria-hidden="true" />
              {uz.coursePage.levels[p.level]}
            </span>
          ) : null}
          {p.hours ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              {uz.projects.hours(p.hours)}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
