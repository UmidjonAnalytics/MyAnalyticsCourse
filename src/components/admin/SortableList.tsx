"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { reorder } from "@/app/admin/(panel)/actions/content";
import { toast } from "@/components/admin/toast";
import { uz } from "@/lib/i18n/uz";

// Drag-and-drop list (mouse, touch and keyboard). Saves the new order right away.
export type SortableItem = { id: string; label: string; content: React.ReactNode };

function Row({ item }: { item: SortableItem }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 bg-surface ${isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={uz.admin.common.dragHandle(item.label)}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted hover:bg-surface-muted active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">{item.content}</div>
    </li>
  );
}

export function SortableList({
  table,
  items,
  className = "divide-y divide-border",
}: {
  table: "categories" | "courses" | "modules" | "lessons" | "bundles";
  items: SortableItem[];
  className?: string;
}) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Keep in sync when the server sends a different list (item added/removed).
  const ids = items.map((i) => i.id).join(",");
  const [lastIds, setLastIds] = useState(ids);
  if (ids !== lastIds) {
    setLastIds(ids);
    setOrder(items.map((i) => i.id));
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const sorted = order.map((id) => byId.get(id)).filter((i): i is SortableItem => Boolean(i));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next);
    startTransition(async () => {
      const res = await reorder(table, next);
      if (res.ok) toast(uz.admin.common.orderSaved);
      else {
        toast(res.error, "error");
        setOrder(order);
      }
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {sorted.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
