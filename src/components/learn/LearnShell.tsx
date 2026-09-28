"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Lock, Menu, PanelLeftClose, PanelLeftOpen, PlayCircle, X } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import type { LessonState } from "@/lib/data/catalog";
import { uz } from "@/lib/i18n/uz";

export type ShellLesson = {
  id: string;
  slug: string;
  title: string;
  state: LessonState;
  number: number;
  minutes: number | null;
  /** Free preview lesson in a course the student has not bought. */
  free: boolean;
};
export type ShellModule = { id: string; title: string; lessons: ShellLesson[] };
export type ShellOutline = {
  courseSlug: string;
  courseTitle: string;
  percent: number;
  completed: number;
  total: number;
  modules: ShellModule[];
};

// ---- remembered "collapsed" state of the left panel (localStorage) ----
const KEY = "learn:pathCollapsed";
const listeners = new Set<() => void>();
function readCollapsed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsed(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    // storage blocked: state still changes for this visit
  }
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function StateIcon({ state, className = "size-4" }: { state: LessonState; className?: string }) {
  const label =
    state === "completed" ? uz.lesson.stateCompleted : state === "current" ? uz.lesson.stateCurrent : state === "locked" ? uz.lesson.stateLocked : uz.lesson.stateOpen;
  const Icon = state === "completed" ? CheckCircle2 : state === "current" ? PlayCircle : state === "locked" ? Lock : Circle;
  const color = state === "completed" || state === "current" ? "text-accent-text" : "text-muted";
  return <Icon className={`${className} shrink-0 ${color}`} aria-label={label} role="img" />;
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" className="size-10" role="img" aria-label={`${uz.lesson.progressLabel}: ${percent}%`}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--surface-muted)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * percent) / 100}
        transform="rotate(-90 20 20)"
      />
      <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">
        {percent}
      </text>
    </svg>
  );
}

function LessonLabel({ lesson }: { lesson: ShellLesson }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="min-w-0 flex-1">{lesson.title}</span>
      {lesson.free ? (
        <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">{uz.topbar.free}</span>
      ) : null}
      {lesson.minutes ? <span className="shrink-0 text-xs font-normal text-muted">{uz.topbar.minutes(lesson.minutes)}</span> : null}
    </span>
  );
}

/** Breadcrumb + "Oldingi / 3 / 28 / Keyingi" above every lesson. */
function LessonBar({ outline, active }: { outline: ShellOutline; active: string }) {
  const lessons = outline.modules.flatMap((m) => m.lessons);
  const index = lessons.findIndex((l) => l.slug === active);
  if (index < 0) return null;
  const current = lessons[index]!;
  const prev = lessons.slice(0, index).reverse().find((l) => l.state !== "locked") ?? null;
  const next = lessons[index + 1] ?? null;
  const href = (slug: string) => `/dars/${outline.courseSlug}/${slug}`;
  const btn = "btn-secondary min-h-10 px-3 text-sm";

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface/95 px-4 py-2 backdrop-blur sm:px-6">
      <nav aria-label={uz.topbar.breadcrumb} className="min-w-0 flex-1 text-sm text-muted">
        <ol className="flex min-w-0 items-center gap-1.5">
          <li className="hidden shrink-0 sm:block">
            <Link href="/#kurslar" className="hover:text-text hover:underline">
              {uz.topbar.courses}
            </Link>
          </li>
          <li aria-hidden="true" className="hidden sm:block">
            <ChevronRight className="size-3.5" />
          </li>
          <li className="hidden min-w-0 truncate md:block">
            <Link href={`/kurs/${outline.courseSlug}`} className="hover:text-text hover:underline">
              {outline.courseTitle}
            </Link>
          </li>
          <li aria-hidden="true" className="hidden md:block">
            <ChevronRight className="size-3.5" />
          </li>
          <li className="min-w-0 truncate font-medium text-text" aria-current="page">
            {current.title}
          </li>
        </ol>
      </nav>
      <div className="flex items-center gap-2">
        {prev ? (
          <Link href={href(prev.slug)} className={btn} aria-label={`${uz.lesson.prev}: ${prev.title}`}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{uz.topbar.prev}</span>
          </Link>
        ) : (
          <span className={`${btn} pointer-events-none opacity-50`} aria-hidden="true">
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">{uz.topbar.prev}</span>
          </span>
        )}
        <span className="min-w-14 text-center text-sm font-semibold tabular-nums" aria-label={uz.lesson.lessonOf(current.number, lessons.length)}>
          {uz.topbar.position(current.number, lessons.length)}
        </span>
        {next ? (
          next.state === "locked" ? (
            <Link href={`/kurs/${outline.courseSlug}`} className={btn} aria-label={uz.topbar.lockedNext} title={uz.topbar.lockedNext}>
              <span className="hidden sm:inline">{uz.topbar.next}</span>
              <Lock className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link href={href(next.slug)} className={btn} aria-label={`${uz.lesson.next}: ${next.title}`}>
              <span className="hidden sm:inline">{uz.topbar.next}</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          )
        ) : (
          <span className={`${btn} pointer-events-none opacity-50`} aria-hidden="true">
            <span className="hidden sm:inline">{uz.topbar.next}</span>
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}

function PathList({ outline, active, onNavigate }: { outline: ShellOutline; active: string | undefined; onNavigate?: () => void }) {
  return (
    <nav aria-label={uz.lesson.path} className="space-y-5">
      {outline.modules.map((m) => (
        <section key={m.id}>
          <h2 className="px-2 text-xs font-bold uppercase tracking-wide text-muted">{m.title}</h2>
          <ul className="mt-2 space-y-0.5">
            {m.lessons.map((l) => {
              const isActive = l.slug === active;
              const cls = `flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                isActive ? "bg-accent-soft font-semibold text-accent-text" : l.state === "locked" ? "text-muted" : "hover:bg-surface-muted"
              }`;
              return (
                <li key={l.id}>
                  {l.state === "locked" ? (
                    <span className={cls} aria-disabled="true">
                      <StateIcon state={l.state} />
                      <LessonLabel lesson={l} />
                    </span>
                  ) : (
                    <Link
                      href={`/dars/${outline.courseSlug}/${l.slug}`}
                      className={cls}
                      aria-current={isActive ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <StateIcon state={l.state} />
                      <LessonLabel lesson={l} />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function PathRail({ outline, active }: { outline: ShellOutline; active: string | undefined }) {
  return (
    <nav aria-label={uz.lesson.path} className="flex flex-col items-center gap-3">
      <ProgressRing percent={outline.percent} />
      <ul className="flex flex-col items-center gap-1">
        {outline.modules.flatMap((m) => m.lessons).map((l) => {
          const isActive = l.slug === active;
          const cls = `flex size-11 items-center justify-center rounded-lg ${isActive ? "bg-accent-soft" : "hover:bg-surface-muted"}`;
          return (
            <li key={l.id}>
              {l.state === "locked" ? (
                <span className={cls} title={l.title}>
                  <StateIcon state={l.state} />
                </span>
              ) : (
                <Link
                  href={`/dars/${outline.courseSlug}/${l.slug}`}
                  className={cls}
                  title={l.title}
                  aria-label={`${l.number}. ${l.title}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <StateIcon state={l.state} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function LearnShell({
  outline,
  userName,
  avatarUrl,
  profile,
  children,
}: {
  outline: ShellOutline;
  userName: string;
  avatarUrl: string | null;
  profile: React.ReactNode;
  children: React.ReactNode;
}) {
  const params = useParams<{ lesson?: string }>();
  const pathname = usePathname();
  const active = params.lesson;
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [drawer, setDrawer] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawer(false);
    menuRef.current?.focus();
  }, []);

  // Close the mobile drawer after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawer(false);
  }

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer, closeDrawer]);

  const moduleIndex = outline.modules.findIndex((m) => m.lessons.some((l) => l.slug === active));

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 sm:gap-3 sm:px-3">
        {/* Mobile: opens the drawer. Desktop: collapses/expands the panel. */}
        <button ref={menuRef} type="button" className="btn-ghost size-11 px-0 lg:hidden" onClick={() => setDrawer(true)} aria-label={uz.lesson.openMenu} aria-expanded={drawer}>
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn-ghost hidden size-11 px-0 lg:inline-flex"
          onClick={() => writeCollapsed(!collapsed)}
          aria-label={uz.lesson.togglePath}
          aria-expanded={!collapsed}
          aria-controls="learn-path"
        >
          {collapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
        </button>
        <Link href="/" className="hidden items-center gap-2 rounded-lg sm:flex">
          <LogoMark className="size-8" />
          <span className="hidden font-display font-bold xl:inline">{uz.brand.name}</span>
        </Link>
        <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
        <Link href={`/kurs/${outline.courseSlug}`} className="min-w-0 truncate font-semibold hover:underline">
          {outline.courseTitle}
        </Link>
        <div className="ml-auto hidden items-center gap-3 md:flex">
          {moduleIndex >= 0 ? (
            <span className="whitespace-nowrap text-sm text-muted">{uz.lesson.moduleOf(moduleIndex + 1, outline.modules.length)}</span>
          ) : null}
          <div
            className="h-2 w-28 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuenow={outline.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={uz.lesson.progressLabel}
          >
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${outline.percent}%` }} />
          </div>
          <span className="whitespace-nowrap text-sm font-semibold">{uz.topbar.complete(outline.percent)}</span>
        </div>
        <div className="ml-auto md:ml-0">
          <ProfileDrawer name={userName} avatarUrl={avatarUrl}>
            {profile}
          </ProfileDrawer>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop left panel */}
        <aside
          id="learn-path"
          className={`hidden shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-surface transition-[width] duration-200 lg:block ${
            collapsed ? "w-16 px-2.5 py-4" : "w-[280px] p-4"
          }`}
        >
          {collapsed ? <PathRail outline={outline} active={active} /> : <PathList outline={outline} active={active} />}
        </aside>

        {/* Mobile drawer */}
        <div
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${drawer ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={closeDrawer}
          aria-hidden="true"
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={uz.lesson.path}
          inert={!drawer}
          className={`fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[85vw] flex-col bg-surface shadow-xl transition-transform duration-200 lg:hidden ${
            drawer ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="font-bold">{uz.lesson.path}</span>
            <button type="button" onClick={closeDrawer} className="btn-ghost size-11 px-0" aria-label={uz.lesson.closeMenu}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="border-b border-border px-4 py-3">
            <div className="flex justify-between text-sm text-muted">
              <span>{uz.course.progress(outline.completed, outline.total)}</span>
              <span className="font-semibold text-text">{outline.percent}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-accent" style={{ width: `${outline.percent}%` }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <PathList outline={outline} active={active} onNavigate={() => setDrawer(false)} />
          </div>
        </aside>

        <main id="main" className="min-w-0 flex-1 overflow-y-auto">
          {active ? <LessonBar outline={outline} active={active} /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
