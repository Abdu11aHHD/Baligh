import { cn } from "@/lib/utils";

const control =
  "w-full rounded-[var(--radius-control)] border border-line bg-white px-3.5 text-ink placeholder:text-muted/80 transition-colors focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-brand-50/50 disabled:text-muted";

export function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-ink">
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(control, "py-3 leading-7 resize-y", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: React.ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11 appearance-none bg-[length:1rem] ps-3.5 pe-9 cursor-pointer", "select-chevron", className)} {...rest}>
      {children}
    </select>
  );
}

export function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-danger-ink">
      {children}
    </p>
  );
}
