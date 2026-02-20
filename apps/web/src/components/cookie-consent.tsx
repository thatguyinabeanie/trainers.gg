"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "cookie-consent";

export type ConsentStatus = "granted" | "denied" | "undecided";

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "undecided";
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "granted" || value === "denied") return value;
  return "undecided";
}

export function setConsentStatus(status: "granted" | "denied") {
  localStorage.setItem(CONSENT_KEY, status);
  window.dispatchEvent(new CustomEvent("consent-change", { detail: status }));
}

export function CookieConsent() {
  const [status, setStatus] = useState<ConsentStatus>("undecided");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStatus(getConsentStatus());
    setMounted(true);
  }, []);

  if (!mounted || status !== "undecided") return null;

  return (
    <div
      className={cn(
        "bg-card border-border fixed right-4 bottom-4 left-4 z-50 flex flex-col gap-3 rounded-lg border p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between",
        "mx-auto max-w-lg"
      )}
    >
      <p className="text-muted-foreground text-sm">
        We use cookies to improve your experience and understand how the site is
        used.
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setConsentStatus("denied");
            setStatus("denied");
          }}
        >
          Decline
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setConsentStatus("granted");
            setStatus("granted");
          }}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}
