import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  variant?: "default" | "narrow" | "wide";
  className?: string;
  noPadding?: boolean;
}

const variantStyles = {
  default: "max-w-screen-2xl",
  narrow: "max-w-2xl",
  wide: "max-w-screen-2xl",
};

export function PageContainer({
  children,
  variant = "default",
  className,
  noPadding = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 container mx-auto duration-300",
        !noPadding && "px-4 py-8 md:px-6",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
