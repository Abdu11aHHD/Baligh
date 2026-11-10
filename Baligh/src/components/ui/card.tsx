import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-white", className)} {...rest} />;
}

export function SectionTitle({ title, description, className }: { title: string; description?: string; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 className="text-2xl sm:text-3xl font-bold leading-snug text-ink">{title}</h2>
      {description && <p className="mt-2 text-muted text-[1.02rem]">{description}</p>}
    </div>
  );
}
