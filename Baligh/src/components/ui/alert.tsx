import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";
const tones: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: "bg-brand-50 border-brand-100 text-brand-900", Icon: Info },
  success: { cls: "bg-success-soft border-[#c3e6d9] text-[#0f5c46]", Icon: CheckCircle2 },
  warning: { cls: "bg-warning-soft border-[#f6dcb3] text-warning-ink", Icon: AlertTriangle },
  danger: { cls: "bg-danger-soft border-[#f2c4c9] text-danger-ink", Icon: OctagonAlert },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "danger" || tone === "warning" ? "alert" : "status"} className={cn("flex gap-3 rounded-2xl border p-4", cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm leading-6">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
