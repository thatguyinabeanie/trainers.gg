"use client";

import { useEffect } from "react";
import NextError from "next/error";
import { captureException } from "@/lib/posthog/client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Log to console as a fallback — PostHog may not be available
    // in error boundary scenarios (e.g. init failure, ad-blocker)
    console.error("Uncaught error:", error);
    captureException(error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
