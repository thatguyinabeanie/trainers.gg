import { getTypeStyle } from "@/lib/pokemon/type-colors";
import { cn } from "@/lib/utils";
import { Gem } from "lucide-react";

interface TeraTypeBadgeProps {
  type: string;
  className?: string;
}

export function TeraTypeBadge({ type, className }: TeraTypeBadgeProps) {
  const style = getTypeStyle(type);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium",
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      <Gem className="h-2.5 w-2.5" />
      {type}
    </span>
  );
}
