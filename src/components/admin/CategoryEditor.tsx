"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { deleteCategory, saveCategory } from "@/app/admin/(panel)/actions/content";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { SortableList } from "@/components/admin/SortableList";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

const t = uz.admin;

function NameForm({ id, initial, onDone }: { id: string | null; initial: string; onDone?: () => void }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-wrap gap-2 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveCategory(id, value);
          if (!res.ok) return toast(res.error, "error");
          toast(t.common.saved);
          if (!id) setValue("");
          onDone?.();
        });
      }}
    >
      <input
        aria-label={t.categories.name}
        placeholder={t.categories.name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input min-w-0 flex-1"
        maxLength={80}
        autoFocus={Boolean(id)}
      />
      <button type="submit" className="btn-primary" disabled={pending || !value.trim()}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {id ? t.common.save : t.categories.add}
      </button>
      {onDone ? (
        <button type="button" className="btn-ghost" onClick={onDone}>
          {t.common.cancel}
        </button>
      ) : null}
    </form>
  );
}

function Row({ id, name, count }: { id: string; name: string; count: number }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <NameForm id={id} initial={name} onDone={() => setEditing(false)} />;
  return (
    <div className="flex items-center gap-2 py-1 pr-2">
      <span className="flex-1 font-semibold">{name}</span>
      <span className="text-sm text-muted">{uz.home.courses(count)}</span>
      <button type="button" className="btn-ghost size-11 px-0" aria-label={`${t.common.edit}: ${name}`} onClick={() => setEditing(true)}>
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      <ConfirmButton
        label={t.categories.delete}
        confirm={t.categories.deleteConfirm}
        action={deleteCategory.bind(null, id)}
        className="btn-ghost text-sm text-danger"
        danger
      />
    </div>
  );
}

export function CategoryEditor({ categories }: { categories: Array<{ id: string; name: string; courseCount: number }> }) {
  return (
    <div className="space-y-4">
      <div className="card px-2">
        {categories.length === 0 ? (
          <p className="p-4 text-muted">{t.common.empty}</p>
        ) : (
          <SortableList
            table="categories"
            items={categories.map((c) => ({ id: c.id, label: c.name, content: <Row id={c.id} name={c.name} count={c.courseCount} /> }))}
          />
        )}
      </div>
      <div className="card px-4 py-2">
        <NameForm id={null} initial="" />
      </div>
    </div>
  );
}
