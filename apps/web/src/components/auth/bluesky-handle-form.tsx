"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Check, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlueskyIcon } from "@/components/icons/bluesky-icon";

// ---------------------------------------------------------------------------
// Handle validation
// ---------------------------------------------------------------------------

type HandleValidation =
  | { status: "empty" }
  | { status: "typing" }
  | { status: "needs-domain" }
  | { status: "valid"; normalized: string }
  | { status: "invalid"; reason: string };

function validateBlueskyHandle(raw: string): HandleValidation {
  const handle = raw.trim().replace(/^@/, "");
  if (!handle) return { status: "empty" };
  if (handle.length < 2) return { status: "typing" };
  if (!handle.includes(".")) return { status: "needs-domain" };

  const parts = handle.split(".");
  if (parts.some((p) => p.length === 0))
    return { status: "invalid", reason: "Handle format looks incomplete" };

  const tld = parts[parts.length - 1];
  if (tld && tld.length < 2) return { status: "typing" };

  if (!/^[a-zA-Z0-9.-]+$/.test(handle))
    return {
      status: "invalid",
      reason: "Only letters, numbers, hyphens, and dots",
    };

  return { status: "valid", normalized: handle.toLowerCase() };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BlueskyHandleFormProps {
  onSubmit: (handle: string) => void;
  loading?: boolean;
  error?: string | null;
  onErrorClear?: () => void;
  onBack: () => void;
}

export function BlueskyHandleForm({
  onSubmit,
  loading = false,
  error,
  onErrorClear,
  onBack,
}: BlueskyHandleFormProps) {
  const [handle, setHandle] = useState("");
  const validation = useMemo(() => validateBlueskyHandle(handle), [handle]);

  // Extract the raw username (before any dot) for domain suggestions
  const rawUsername = handle.trim().replace(/^@/, "");

  const handleDomainClick = (domain: string) => {
    setHandle(`${rawUsername}.${domain}`);
    onErrorClear?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validation.status === "valid") {
      onSubmit(validation.normalized);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHandle(e.target.value);
    onErrorClear?.();
  };

  const isValid = validation.status === "valid";
  const canSubmit = isValid && !loading;

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      {/* Branded header */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-[#0085FF]/15 dark:bg-[#0085FF]/20">
          <BlueskyIcon className="size-8 text-[#0085FF]" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Continue with Bluesky
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter your Bluesky handle to sign in or create an account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Handle input with @ prefix */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium">
              @
            </span>
            <Input
              type="text"
              placeholder="username.bsky.social"
              value={handle}
              onChange={handleChange}
              disabled={loading}
              autoFocus
              className={`h-11 pr-9 pl-7 ${
                isValid
                  ? "border-emerald-500 focus-visible:ring-emerald-500/30"
                  : ""
              }`}
            />
            {/* Green check when valid */}
            {isValid && (
              <Check className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-500" />
            )}
          </div>

          {/* Fixed-height feedback area to prevent layout shift */}
          <div className="min-h-[28px]">
            {/* Domain suggestion pills */}
            {validation.status === "needs-domain" &&
              rawUsername.length >= 2 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleDomainClick("bsky.social")}
                    className="border-border bg-muted text-foreground hover:bg-accent rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  >
                    {rawUsername}.bsky.social
                  </button>
                </div>
              )}

            {/* Validation hint */}
            {validation.status === "invalid" && (
              <p className="text-muted-foreground text-xs">
                {validation.reason}
              </p>
            )}
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="bg-destructive/10 flex items-start gap-2 rounded-lg p-3">
            <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Redirect notice */}
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <ExternalLink className="size-3 shrink-0" />
          You&apos;ll be redirected to Bluesky to authorize
        </p>

        {/* Submit button — Bluesky brand blue */}
        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-11 w-full gap-2 bg-[#0085FF] text-white hover:bg-[#0073de] disabled:opacity-50"
        >
          {loading ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <BlueskyIcon className="size-4" />
          )}
          Continue to Bluesky
        </Button>
      </form>

      {/* Help link */}
      <p className="text-muted-foreground text-center text-xs">
        Don&apos;t have a Bluesky account?{" "}
        <a
          href="https://bsky.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Create one
        </a>
      </p>

      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        Back to all sign-in options
      </button>
    </div>
  );
}
