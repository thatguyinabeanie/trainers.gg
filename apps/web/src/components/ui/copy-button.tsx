"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CopyButtonProps {
  text: string;
  label?: string;
  toastMessage?: string;
  className?: string;
  size?: "xs" | "sm" | "default";
}

export function CopyButton({
  text,
  label,
  toastMessage = "Copied to clipboard",
  className,
  size = "sm",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(toastMessage);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [text, toastMessage]);

  return (
    <Button
      variant="ghost"
      size={size === "xs" ? "icon-xs" : size === "sm" ? "icon-sm" : "icon"}
      onClick={handleCopy}
      className={cn("shrink-0", className)}
      aria-label={label ?? `Copy "${text}" to clipboard`}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}
