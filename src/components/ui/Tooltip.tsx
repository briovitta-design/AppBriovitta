import { cn } from "@/lib/utils";

/** Tooltip leve em CSS puro — sem dependência extra. Uso: <Tooltip label="..."><button/></Tooltip> */
export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "right";
  className?: string;
}) {
  const posClasses = {
    top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
    right: "left-full top-1/2 ml-2 -translate-y-1/2",
  }[side];

  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-text-main px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-popover transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
          posClasses
        )}
      >
        {label}
      </span>
    </span>
  );
}
