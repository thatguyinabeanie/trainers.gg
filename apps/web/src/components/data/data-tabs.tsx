"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { type DataTab } from "./usage-filters";

// =============================================================================
// Types
// =============================================================================

interface DataTabsProps {
  /** Controlled active tab — driven by URL state in the parent. */
  value: DataTab;
  /** Called when the user switches tabs. */
  onValueChange: (tab: DataTab) => void;
  /** Content for the Overview tab panel. */
  overviewContent?: React.ReactNode;
  /** Content for the Trends tab panel. */
  trendsContent?: React.ReactNode;
  /** Content for the Sources tab panel. */
  sourcesContent?: React.ReactNode;
}

// =============================================================================
// DataTabs
// =============================================================================

/**
 * Thin controlled wrapper over the shadcn Tabs primitive for the /data page.
 *
 * - Three triggers: Overview / Trends / Sources.
 * - Active tab is **URL-driven** (controlled by parent via `value` +
 *   `onValueChange`) — no internal state.
 * - The trigger row uses the mobile horizontal-scroll pattern so it never
 *   overflows on narrow viewports.
 * - Panel slots (`overviewContent`, `trendsContent`, `sourcesContent`) let
 *   each chart task mount its component independently.
 */
export function DataTabs({
  value,
  onValueChange,
  overviewContent,
  trendsContent,
  sourcesContent,
}: DataTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as DataTab)}
    >
      {/* Trigger row — horizontal scroll on mobile */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">{overviewContent}</TabsContent>
      <TabsContent value="trends">{trendsContent}</TabsContent>
      <TabsContent value="sources">{sourcesContent}</TabsContent>
    </Tabs>
  );
}

// Re-export TabsContent so chart tasks can compose their own panels
// without importing from the shadcn primitive directly.
export { TabsContent };
