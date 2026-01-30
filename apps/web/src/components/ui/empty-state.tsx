import * as React from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "illustrated" | "minimal" | "inline";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "illustrated",
  className,
}: EmptyStateProps) {
  if (variant === "inline") {
    return (
      <p
        className={cn(
          "text-muted-foreground py-4 text-center text-sm",
          className
        )}
      >
        {title}
      </p>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn("py-8 text-center", className)}>
        <p className="text-muted-foreground">{title}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="bg-muted mb-4 rounded-full p-4">
          <Icon className="text-muted-foreground h-8 w-8" />
        </div>
      )}
      <h3 className="mb-1 text-lg font-medium">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-4 max-w-sm text-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
