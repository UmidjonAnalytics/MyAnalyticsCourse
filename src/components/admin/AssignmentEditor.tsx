"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FileSpreadsheet, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { saveAssignment } from "@/app/admin/(panel)/actions/assignments";
import { MarkdownField } from "@/components/admin/fields";
import { toast } from "@/components/admin/toast";
import { Notice } from "@/components/Notice";
import { normalizeEmbedUrl } from "@/lib/embed";
import { uz } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/client";

const t = uz.admin.assignments;
const MAX_BYTES = 20 * 1024 * 1024;

export type EditorQuestion = {
  id?: string;
  key: string;
  prompt: string;
  answer_type: "number" | "text";
  placeholder: string;
  hint: string;
  answers: string;
  tolerance: number;
  case_sensitive: boolean;
};

let seq = 0;
const blankQuestion = (): EditorQuestion => ({
  key: `new-${++seq}`,
  prompt: "",
  answer_type: "number",
  placeholder: "",
  hint: "",
  answers: "",
  tolerance: 0,
  case_sensitive: false,
});

function QuestionCard({
  q,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  q: EditorQuestion;
  index: number;
  count: number;
  onChange: (patch: Partial<EditorQuestion>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = useId();
  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">
          {t.prompt} {index + 1}
        </span>
        <div className="flex gap-1">
          <button type="button" className="btn-ghost size-9 px-0" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`${t.prompt} ${index + 1}: ↑`}>
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="btn-ghost size-9 px-0" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`${t.prompt} ${index + 1}: ↓`}>
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className="btn-ghost size-9 px-0 text-danger" onClick={onRemove} aria-label={`${t.removeQuestion} ${index + 1}`}>
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-4">
        <div>
          <label htmlFor={`${id}-p`} className="label">
            {t.prompt}
          </label>
          <textarea id={`${id}-p`} className="input min-h-20 py-2" value={q.prompt} maxLength={1000} onChange={(e) => onChange({ prompt: e.target.value })} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div>
            <label htmlFor={`${id}-ty`} className="label">
              {t.answerType}
            </label>
            <select id={`${id}-ty`} className="input" value={q.answer_type} onChange={(e) => onChange({ answer_type: e.target.value as "number" | "text" })}>
              <option value="number">{t.typeNumber}</option>
              <option value="text">{t.typeText}</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-a`} className="label">
              {t.answers}
            </label>
            <textarea
              id={`${id}-a`}
              className="input min-h-11 py-2 font-mono text-sm"
              rows={2}
              value={q.answers}
              onChange={(e) => onChange({ answers: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {q.answer_type === "number" ? (
            <div>
              <label htmlFor={`${id}-tol`} className="label">
                {t.tolerance}
              </label>
              <input
                id={`${id}-tol`}
                className="input"
                inputMode="decimal"
                value={q.tolerance}
                onChange={(e) => onChange({ tolerance: Math.max(0, Number(e.target.value.replace(",", ".")) || 0) })}
              />
            </div>
          ) : (
            <label className="flex min-h-11 items-center gap-3 self-end">
              <input
                type="checkbox"
                checked={q.case_sensitive}
                onChange={(e) => onChange({ case_sensitive: e.target.checked })}
                className="size-5 accent-[var(--accent)]"
              />
              <span className="text-sm font-semibold">{t.caseSensitive}</span>
            </label>
          )}
          <div>
            <label htmlFor={`${id}-ph`} className="label">
              {t.placeholder}
            </label>
            <input id={`${id}-ph`} className="input" value={q.placeholder} maxLength={200} onChange={(e) => onChange({ placeholder: e.target.value })} />
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-h`} className="label">
            {t.hint}
          </label>
          <input id={`${id}-h`} className="input" value={q.hint} maxLength={1000} onChange={(e) => onChange({ hint: e.target.value })} />
        </div>
      </div>
    </li>
  );
}

export function AssignmentEditor({
  assignment,
  questions: initialQuestions,
  fileName,
}: {
  assignment: {
    id: string;
    title: string;
    instructions_md: string;
    points: number;
    is_published: boolean;
    embed_url: string | null;
    file_path: string | null;
    allow_download: boolean;
  };
  questions: EditorQuestion[];
  fileName: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(assignment.title);
  const [points, setPoints] = useState(assignment.points);
  const [published, setPublished] = useState(assignment.is_published);
  const [embed, setEmbed] = useState(assignment.embed_url ?? "");
  const [filePath, setFilePath] = useState(assignment.file_path);
  const [uploadedName, setUploadedName] = useState(fileName);
  const [allowDownload, setAllowDownload] = useState(assignment.allow_download);
  const [questions, setQuestions] = useState<EditorQuestion[]>(initialQuestions.length ? initialQuestions : [blankQuestion()]);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const embedPreview = embed.trim() ? normalizeEmbedUrl(embed) : null;

  const upload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["xlsx", "xlsm", "xls", "csv"].includes(ext) || file.size > MAX_BYTES) {
      toast(t.fileError, "error");
      return;
    }
    setUploading(true);
    const path = `${assignment.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("assignment-files").upload(path, file, { upsert: false, contentType: file.type || undefined });
    setUploading(false);
    if (error) {
      toast(t.fileError, "error");
      return;
    }
    // A previous upload that was never saved is removed right away.
    if (filePath && filePath !== assignment.file_path) await createClient().storage.from("assignment-files").remove([filePath]);
    setFilePath(path);
    setUploadedName(file.name);
  };

  const patch = (key: string, p: Partial<EditorQuestion>) => setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...p } : q)));
  const move = (index: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs];
      const [item] = next.splice(index, 1);
      next.splice(index + dir, 0, item!);
      return next;
    });

  const save = (form: HTMLFormElement) =>
    startTransition(async () => {
      const instructions_md = String(new FormData(form).get("instructions_md") ?? "");
      const res = await saveAssignment({
        id: assignment.id,
        title,
        instructions_md,
        points,
        is_published: published,
        embed_url: embed,
        file_path: filePath,
        allow_download: allowDownload,
        questions: questions.map((q) => ({
          ...(q.id ? { id: q.id } : {}),
          prompt: q.prompt,
          answer_type: q.answer_type,
          placeholder: q.placeholder,
          hint: q.hint,
          answers: q.answers
            .split("\n")
            .map((a) => a.trim())
            .filter(Boolean),
          tolerance: q.tolerance,
          case_sensitive: q.case_sensitive,
        })),
      });
      if (res.ok) toast(res.message ?? uz.admin.common.saved);
      else toast(res.error, "error");
      router.refresh();
    });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save(e.currentTarget);
      }}
    >
      <div className="card space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div>
            <label htmlFor="as-title" className="label">
              {t.titleLabel}
            </label>
            <input id="as-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </div>
          <div>
            <label htmlFor="as-points" className="label">
              {t.points}
            </label>
            <input
              id="as-points"
              className="input"
              inputMode="numeric"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value.replace(/\D/g, "")) || 0)}
            />
          </div>
        </div>
        <MarkdownField name="instructions_md" label={t.instructions} defaultValue={assignment.instructions_md} rows={6} />
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="size-5 accent-[var(--accent)]" />
          <span className="text-sm font-semibold">{t.published}</span>
        </label>
      </div>

      <div className="card space-y-5 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <FileSpreadsheet className="size-5 text-accent-text" aria-hidden="true" />
          {uz.assignment.workbook}
        </h2>
        <div>
          <label htmlFor="as-embed" className="label">
            {t.embed}
          </label>
          <textarea
            id="as-embed"
            className="input min-h-20 py-2 font-mono text-xs"
            value={embed}
            onChange={(e) => setEmbed(e.target.value)}
            aria-describedby="as-embed-hint"
            maxLength={4000}
          />
          <p id="as-embed-hint" className="mt-1 text-xs text-muted">
            {t.embedHint}
          </p>
          {embed.trim() && !embedPreview ? (
            <div className="mt-2">
              <Notice tone="error">{t.embedInvalid}</Notice>
            </div>
          ) : null}
        </div>

        <div>
          <p className="label">{t.file}</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-secondary cursor-pointer">
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
              {uploading ? t.fileUploading : t.fileUpload}
              <input
                type="file"
                accept=".xlsx,.xlsm,.xls,.csv"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void upload(f);
                }}
              />
            </label>
            {filePath ? (
              <>
                <span className="text-sm font-semibold">{uploadedName ?? filePath.split("/").pop()}</span>
                <button type="button" className="btn-ghost text-sm text-danger" onClick={() => setFilePath(null)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t.fileRemove}
                </button>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">{t.fileHint}</p>
        </div>

        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} className="size-5 accent-[var(--accent)]" />
          <span className="text-sm font-semibold">{t.allowDownload}</span>
        </label>

        {embedPreview ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <iframe src={embedPreview} title={uz.admin.common.preview} className="block h-[420px] w-full" loading="lazy" />
          </div>
        ) : null}
      </div>

      <div className="card space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">{t.questions}</h2>
          <p className="mt-1 text-sm text-muted">{t.questionsLead}</p>
        </div>
        {questions.length === 0 ? <Notice>{t.noQuestions}</Notice> : null}
        <ol className="space-y-4">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.key}
              q={q}
              index={i}
              count={questions.length}
              onChange={(p) => patch(q.key, p)}
              onMove={(dir) => move(i, dir)}
              onRemove={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}
            />
          ))}
        </ol>
        <button type="button" className="btn-secondary" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
          <Plus className="size-4" aria-hidden="true" />
          {t.addQuestion}
        </button>
      </div>

      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-border bg-bg/95 px-1 py-3 backdrop-blur">
        <button type="submit" className="btn-primary" disabled={pending || uploading}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {pending ? uz.common.saving : uz.admin.common.save}
        </button>
      </div>
    </form>
  );
}
