import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  variant?: "default" | "narrow" | "wide";
  className?: string;
}

const variantStyles = {
  default: "max-w-screen-xl",
  narrow: "max-w-2xl",
  wide: "max-w-screen-2xl",
};

export function PageContainer({
  children,
  variant = "default",
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "container mx-auto px-4 py-8 md:px-6",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
