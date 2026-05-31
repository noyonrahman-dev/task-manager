"use client";

import * as React from "react";

import { TaskCard } from "@/components/tasks/task-card";
import type { Task } from "@/lib/types";

interface TaskListProps {
  tasks: Task[];
  onToggleDone?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TaskList({ tasks, onToggleDone, onDelete }: TaskListProps) {
  return (
    <ul className="flex flex-col gap-2.5">
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskCard task={task} onToggleDone={onToggleDone} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}
