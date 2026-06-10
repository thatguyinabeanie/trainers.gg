import { Spinner } from "@/components/ui/spinner";

/**
 * Suspense boundary for the auth callback routes. These pages read cookies
 * before rendering anything, so under cacheComponents/PPR they need a
 * loading boundary to prerender a shell.
 */
export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}
