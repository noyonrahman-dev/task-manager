import { AlertOctagon, ArrowUp, Equal, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, type TaskPriority } from "@/lib/constants";

const STYLES: Record<TaskPriority, { className: string; Icon: React.ComponentType<{ className?: string }> }> = {
  urgent: {
    className:
      "border-priority-urgent/30 bg-priority-urgent/10 text-priority-urgent dark:bg-priority-urgent/15",
    Icon: AlertOctagon,
  },
  high: {
    className:
      "border-priority-high/30 bg-priority-high/10 text-priority-high dark:bg-priority-high/15",
    Icon: ArrowUp,
  },
  medium: {
    className:
      "border-priority-medium/30 bg-priority-medium/10 text-priority-medium dark:bg-priority-medium/20",
    Icon: Equal,
  },
  low: {
    className:
      "border-priority-low/30 bg-priority-low/10 text-priority-low dark:bg-priority-low/20",
    Icon: ChevronDown,
  },
};

export function PriorityBadge({
  priority,
  className,
  iconOnly = false,
}: {
  priority: TaskPriority;
  className?: string;
  iconOnly?: boolean;
}) {
  const { className: variant, Icon } = STYLES[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        variant,
        className,
      )}
      aria-label={`Priority: ${PRIORITY_LABEL[priority]}`}
    >
      <Icon className="size-3" />
      {!iconOnly && <span>{PRIORITY_LABEL[priority]}</span>}
    </span>
  );
}
