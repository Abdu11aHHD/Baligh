import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-[0_6px_18px_-8px_rgb(87_39_195/0.7)] disabled:bg-brand-300 disabled:shadow-none",
  secondary: "bg-brand-100 text-brand-700 hover:bg-brand-200 disabled:opacity-60",
  outline: "border border-line bg-white text-ink hover:border-brand-300 hover:text-brand-700 disabled:opacity-60",
  ghost: "text-brand-700 hover:bg-brand-50 disabled:opacity-60",
  danger: "bg-danger text-white hover:bg-danger-ink disabled:opacity-60",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-5 text-[0.95rem] gap-2 rounded-[var(--radius-control)]",
  lg: "h-14 px-7 text-base gap-2.5 rounded-2xl",
};

const base =
  "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors duration-150 select-none disabled:cursor-not-allowed";

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: { href: string; variant?: Variant; size?: Size } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}
