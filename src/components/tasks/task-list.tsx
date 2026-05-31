"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { TaskCard } from "@/components/tasks/task-card";
import type { Task } from "@/lib/types";

interface TaskListProps {
  /** Tasks to display, in the order they should appear. */
  tasks: Task[];
  onToggleDone?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Called when the user reorders the visible list via drag or keyboard. */
  onReorder?: (next: Task[], moved: { id: string; fromIndex: number; toIndex: number }) => void;
  /** When false, the drag handle is disabled (e.g. while filters/search are active). */
  reorderEnabled?: boolean;
}

export function TaskList({
  tasks,
  onToggleDone,
  onDelete,
  onReorder,
  reorderEnabled = true,
}: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a small drag distance so single clicks (e.g. on the menu)
      // never start an accidental drag from the grip.
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = React.useMemo(() => tasks.map((t) => t.id), [tasks]);

  function handleDragEnd(event: DragEndEvent) {
    if (!onReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = tasks.findIndex((t) => t.id === active.id);
    const toIndex = tasks.findIndex((t) => t.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = arrayMove(tasks, fromIndex, toIndex);
    onReorder(next, { id: String(active.id), fromIndex, toIndex });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2.5">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onToggleDone={onToggleDone}
                onDelete={onDelete}
                draggable={reorderEnabled}
              />
            </li>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
