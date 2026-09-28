"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { archiveItem, createLesson, saveModule } from "@/app/admin/(panel)/actions/content";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { PublishSwitch } from "@/components/admin/PublishSwitch";
import { SortableList } from "@/components/admin/SortableList";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

export type EditorLesson = { id: string; title: string; is_published: boolean; is_free_preview: boolean };
export type EditorModule = { id: string; title: string; is_published: boolean; lessons: EditorLesson[] };

const t = uz.admin;

/** One-line form: text input + button (add module, add lesson, rename). */
function InlineForm({
  label,
  placeholder,
  initial = "",
  submitLabel,
  onSubmit,
  onCancel,
}: {
  label: string;
  placeholder?: string;
  initial?: string;
  submitLabel: string;
  onSubmit: (value: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        startTransition(async () => {
          if (await onSubmit(value.trim())) setValue("");
        });
      }}
    >
      <input
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input min-w-0 flex-1"
        maxLength={200}
        autoFocus={Boolean(initial)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && onCancel) onCancel();
        }}
      />
      <button type="submit" className="btn-primary" disabled={pending || !value.trim()}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {submitLabel}
      </button>
      {onCancel ? (
        <button type="button" className="btn-ghost" onClick={onCancel}>
          {t.common.cancel}
        </button>
      ) : null}
    </form>
  );
}

function ModuleCard({ courseId, module }: { courseId: string; module: EditorModule }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <div className="py-3 pr-3">
      <div className="flex flex-wrap items-center gap-2">
        {renaming ? (
          <div className="min-w-0 flex-1">
            <InlineForm
              label={t.curriculum.moduleTitle}
              initial={module.title}
              submitLabel={t.common.save}
              onCancel={() => setRenaming(false)}
              onSubmit={async (v) => {
                const res = await saveModule(courseId, module.id, v);
                if (!res.ok) toast(res.error, "error");
                else setRenaming(false);
                return res.ok;
              }}
            />
          </div>
        ) : (
          <>
            <h2 className="min-w-0 flex-1 font-bold">{module.title}</h2>
            <button type="button" className="btn-ghost size-11 px-0" aria-label={`${t.curriculum.rename}: ${module.title}`} onClick={() => setRenaming(true)}>
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            <PublishSwitch entity="module" id={module.id} name={module.title} value={module.is_published} />
            <ConfirmButton
              label={t.common.archive}
              confirm={t.common.archiveConfirm}
              action={archiveItem.bind(null, "module", module.id)}
              className="btn-ghost text-sm text-danger"
            />
          </>
        )}
      </div>

      <div className="mt-2 rounded-lg border border-border">
        {module.lessons.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted">{t.curriculum.noLessons}</p>
        ) : (
          <SortableList
            table="lessons"
            items={module.lessons.map((l) => ({
              id: l.id,
              label: l.title,
              content: (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1 pr-2">
                  <Link href={`/darslar/${l.id}`} className="min-w-0 flex-1 text-sm font-semibold hover:underline">
                    {l.title}
                  </Link>
                  {l.is_free_preview ? (
                    <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">{t.curriculum.freePreview}</span>
                  ) : null}
                  <PublishSwitch entity="lesson" id={l.id} name={l.title} value={l.is_published} />
                  <ConfirmButton
                    label={t.common.archive}
                    confirm={t.common.archiveConfirm}
                    action={archiveItem.bind(null, "lesson", l.id)}
                    className="btn-ghost text-xs text-danger"
                  />
                </div>
              ),
            }))}
          />
        )}
        <div className="border-t border-border p-2">
          {adding ? (
            <InlineForm
              label={t.curriculum.lessonTitle}
              submitLabel={t.common.add}
              onCancel={() => setAdding(false)}
              onSubmit={async (v) => {
                const res = await createLesson(module.id, v);
                if (!res.ok) {
                  toast(res.error, "error");
                  return false;
                }
                setAdding(false);
                router.push(`/darslar/${res.id}`);
                return true;
              }}
            />
          ) : (
            <button type="button" className="btn-ghost text-sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t.curriculum.addLesson}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CurriculumEditor({ courseId, modules }: { courseId: string; modules: EditorModule[] }) {
  return (
    <div className="space-y-4">
      <div className="card overflow-hidden px-2">
        {modules.length === 0 ? (
          <p className="p-4 text-muted">{t.curriculum.noModules}</p>
        ) : (
          <SortableList
            table="modules"
            items={modules.map((m) => ({ id: m.id, label: m.title, content: <ModuleCard courseId={courseId} module={m} /> }))}
          />
        )}
      </div>
      <div className="card p-4">
        <h2 className="mb-2 text-sm font-bold">{t.curriculum.addModule}</h2>
        <InlineForm
          label={t.curriculum.moduleTitle}
          placeholder={t.curriculum.moduleTitlePlaceholder}
          submitLabel={t.common.add}
          onSubmit={async (v) => {
            const res = await saveModule(courseId, null, v);
            if (!res.ok) toast(res.error, "error");
            return res.ok;
          }}
        />
      </div>
    </div>
  );
}
