import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function UsernameInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <div className="border-input focus-within:ring-ring/50 focus-within:border-ring flex items-center overflow-hidden rounded-md border focus-within:ring-[3px]">
      <Input
        type="text"
        autoComplete="username"
        {...props}
        className={cn(
          "rounded-none border-0 shadow-none focus-visible:ring-0",
          className
        )}
      />
      <span className="text-muted-foreground border-l-input bg-muted border-l px-3 text-sm whitespace-nowrap select-none">
        .{process.env.NEXT_PUBLIC_PDS_HANDLE_DOMAIN || "trainers.gg"}
      </span>
    </div>
  );
}

export { UsernameInput };
