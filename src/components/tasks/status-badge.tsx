import { Circle, CircleCheck, CircleDot } from "lucide-react";

import { cn } from "@/lib/utils";
import { STATUS_LABEL, type TaskStatus } from "@/lib/constants";

const STYLES: Record<TaskStatus, { className: string; Icon: React.ComponentType<{ className?: string }> }> = {
  todo: {
    className: "text-muted-foreground",
    Icon: Circle,
  },
  in_progress: {
    className: "text-blue-600 dark:text-blue-400",
    Icon: CircleDot,
  },
  done: {
    className: "text-emerald-600 dark:text-emerald-400",
    Icon: CircleCheck,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  const { className: variant, Icon } = STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", variant, className)}>
      <Icon className="size-3.5" />
      {STATUS_LABEL[status]}
    </span>
  );
}
