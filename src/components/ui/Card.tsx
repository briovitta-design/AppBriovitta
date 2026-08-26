import { cn } from "@/lib/utils";

export function Card({
  className,
  accent,
  hoverable,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { accent?: boolean; hoverable?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-card p-5 shadow-card",
        hoverable && "transition-shadow hover:shadow-card-hover",
        accent &&
          "before:absolute before:inset-x-0 before:top-0 before:h-1 before:rounded-t-2xl before:bg-brand-gradient",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-display text-base font-semibold text-text-main", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-text-secondary", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
}
