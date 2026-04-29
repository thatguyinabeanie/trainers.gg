import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the team workspace.
 * Mirrors the workspace layout: header bar, team strip, split panel.
 */
export default function TeamWorkspaceLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header bar skeleton — mirrors the responsive layout in layout.tsx:
          stacks identity above actions on phones, single h-12 row at md+. */}
      <header className="shrink-0 border-b">
        <div className="flex flex-col gap-1 px-3 py-2 md:h-12 md:flex-row md:items-center md:gap-2 md:px-4 md:py-0">
          {/* Identity row */}
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <span className="text-muted-foreground text-sm">/</span>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-2 md:ml-auto">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </header>

      {/* Workspace body */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Team strip skeleton */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="size-12 rounded-md" />
          ))}
        </div>

        {/* Split panel skeleton */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor panel (left) */}
          <div className="flex w-1/2 flex-col gap-4 border-r p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-40" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>

          {/* Context panel (right) */}
          <div className="flex w-1/2 flex-col gap-4 p-4">
            {/* Tab bar skeleton */}
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
            {/* Content skeleton */}
            <div className="flex flex-col gap-3">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
