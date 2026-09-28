"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Reply, Send, Trash2 } from "lucide-react";
import { deleteComment, postComment } from "@/app/(learn)/dars/actions";
import { Avatar } from "@/components/Avatar";
import { Notice } from "@/components/Notice";
import { formatDateTime } from "@/lib/format";
import { uz } from "@/lib/i18n/uz";

const t = uz.discussion;

export type DiscussionComment = {
  id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  deleted: boolean;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  author_is_admin: boolean;
};

function CommentForm({
  lessonId,
  courseSlug,
  parentId,
  placeholder,
  autoFocus,
  onDone,
  onCancel,
}: {
  lessonId: string;
  courseSlug: string;
  parentId: string | null;
  placeholder: string;
  autoFocus?: boolean;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldId = `comment-${parentId ?? "new"}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      setError(null);
      const res = await postComment({ lessonId, courseSlug, body, parentId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      onDone();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={fieldId} className="sr-only">
        {placeholder}
      </label>
      <textarea
        id={fieldId}
        className="input min-h-24 resize-y py-2.5"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        maxLength={4000}
        autoFocus={autoFocus}
        required
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={pending}>
            {t.cancel}
          </button>
        ) : null}
        <button type="submit" className="btn-primary" disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          {pending ? t.posting : t.post}
        </button>
      </div>
    </form>
  );
}

function CommentItem({
  c,
  canDelete,
  onDelete,
  deleting,
  children,
}: {
  c: DiscussionComment;
  canDelete: boolean;
  onDelete: () => void;
  deleting: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0">
        <Avatar name={c.author_name} url={c.author_avatar} size={36} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold">{c.author_name}</span>
          {c.author_is_admin ? (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">{t.instructor}</span>
          ) : null}
          <time dateTime={c.created_at} className="text-muted">
            {formatDateTime(c.created_at)}
          </time>
        </div>
        {c.deleted ? (
          <p className="mt-1 text-sm italic text-muted">{t.deleted}</p>
        ) : (
          <p className="mt-1 whitespace-pre-wrap break-words">{c.body}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {children}
          {canDelete && !c.deleted ? (
            <button type="button" className="btn-ghost min-h-9 px-2 text-sm text-muted" onClick={onDelete} disabled={deleting}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t.delete}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Discussion({
  lessonId,
  courseSlug,
  comments,
  currentUserId,
  isAdmin,
}: {
  lessonId: string;
  courseSlug: string;
  comments: DiscussionComment[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState(false);

  const roots = comments.filter((c) => !c.parent_id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const replies = (id: string) => comments.filter((c) => c.parent_id === id);
  // Hide deleted threads that have no replies left.
  const visibleRoots = roots.filter((c) => !c.deleted || replies(c.id).some((r) => !r.deleted));
  const visibleCount = comments.filter((c) => !c.deleted).length;

  const remove = (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    startDelete(async () => {
      setError(false);
      const res = await deleteComment(id, courseSlug);
      if (!res.ok) setError(true);
      router.refresh();
    });
  };

  const canDelete = (c: DiscussionComment) => isAdmin || c.user_id === currentUserId;

  return (
    <section aria-labelledby="discussion-title" className="space-y-6">
      <div>
        <h2 id="discussion-title" className="flex items-center gap-2 text-lg font-bold">
          <MessageSquare className="size-5 text-accent-text" aria-hidden="true" />
          {t.title}
          <span className="text-sm font-normal text-muted">· {t.count(visibleCount)}</span>
        </h2>
        <p className="mt-1 text-sm text-muted">{t.lead}</p>
      </div>

      <CommentForm lessonId={lessonId} courseSlug={courseSlug} parentId={null} placeholder={t.placeholder} onDone={() => router.refresh()} />
      {error ? <Notice tone="error">{uz.errors.generic}</Notice> : null}

      {visibleRoots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted">{t.empty}</p>
      ) : (
        <ul className="space-y-4">
          {visibleRoots.map((c) => (
            <li key={c.id} className="card p-4 sm:p-5">
              <CommentItem c={c} canDelete={canDelete(c)} onDelete={() => remove(c.id)} deleting={deleting}>
                {!c.deleted ? (
                  <button
                    type="button"
                    className="btn-ghost min-h-9 px-2 text-sm text-muted"
                    onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                    aria-expanded={replyTo === c.id}
                  >
                    <Reply className="size-4" aria-hidden="true" />
                    {t.reply}
                  </button>
                ) : null}
              </CommentItem>

              {replies(c.id).length > 0 || replyTo === c.id ? (
                <div className="mt-4 space-y-4 border-l-2 border-border pl-4 sm:ml-12">
                  {replies(c.id)
                    .filter((r) => !r.deleted)
                    .map((r) => (
                      <CommentItem key={r.id} c={r} canDelete={canDelete(r)} onDelete={() => remove(r.id)} deleting={deleting} />
                    ))}
                  {replyTo === c.id ? (
                    <CommentForm
                      lessonId={lessonId}
                      courseSlug={courseSlug}
                      parentId={c.id}
                      placeholder={t.replyPlaceholder}
                      autoFocus
                      onCancel={() => setReplyTo(null)}
                      onDone={() => {
                        setReplyTo(null);
                        router.refresh();
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
