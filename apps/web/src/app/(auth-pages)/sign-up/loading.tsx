import { Spinner } from "@/components/ui/spinner";

// Segment-level Suspense boundary — required under cacheComponents/PPR for
// any route whose page reads request data (cookies, params, searchParams).
export default function Loading() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}
