import { AlertTriangle, ArrowDown, ArrowUp, Minus, Siren } from "lucide-react";
import { PRIORITY_LABELS, STATUS_LABELS, type Priority, type Status } from "@/lib/constants";
import { cn } from "@/lib/utils";

const statusStyles: Record<Status, string> = {
  new: "bg-brand-100 text-brand-700",
  in_review: "bg-warning-soft text-warning-ink",
  in_progress: "bg-[#e5efff] text-[#2456a8]",
  resolved: "bg-success-soft text-success",
  closed: "bg-[#efedf3] text-muted",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", statusStyles[status], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

const priorityStyles: Record<Priority, { cls: string; Icon: typeof Minus }> = {
  low: { cls: "text-muted bg-[#f3f2f6]", Icon: ArrowDown },
  normal: { cls: "text-brand-700 bg-brand-50", Icon: Minus },
  high: { cls: "text-warning-ink bg-warning-soft", Icon: ArrowUp },
  urgent: { cls: "text-white bg-danger", Icon: Siren },
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const { cls, Icon } = priorityStyles[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function SafetyBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-danger-ink">
      <AlertTriangle className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
