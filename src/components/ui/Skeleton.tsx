import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-bg-secondary bg-[length:400px_100%]",
        "bg-gradient-to-r from-bg-secondary via-border to-bg-secondary",
        className
      )}
      {...props}
    />
  );
}
