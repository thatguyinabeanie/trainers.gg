import { getTypeStyle } from "@/lib/pokemon/type-colors";
import { cn } from "@/lib/utils";
import { Gem } from "lucide-react";

interface TeraTypeBadgeProps {
  type: string;
  size?: "default" | "sm";
  className?: string;
}

export function TeraTypeBadge({
  type,
  size = "default",
  className,
}: TeraTypeBadgeProps) {
  const style = getTypeStyle(type);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border leading-none font-medium",
        size === "sm"
          ? "px-1 py-px text-[8px]"
          : "gap-1 px-1.5 py-0.5 text-[10px]",
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      <Gem className={size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"} />
      {type}
    </span>
  );
}
