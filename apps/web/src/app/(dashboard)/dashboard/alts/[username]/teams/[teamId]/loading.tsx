import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the team workspace.
 * Mirrors the workspace layout: header bar, team strip, split panel.
 */
export default function TeamWorkspaceLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header bar skeleton */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        {/* Breadcrumb skeleton */}
        <Skeleton className="h-4 w-20" />
        <span className="text-muted-foreground text-sm">/</span>
        <Skeleton className="h-4 w-32" />
        {/* Format badge skeleton */}
        <Skeleton className="h-5 w-16 rounded-full" />

        {/* Action buttons skeleton */}
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-22" />
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
