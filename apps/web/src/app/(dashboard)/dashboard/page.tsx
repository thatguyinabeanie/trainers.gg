import { Suspense } from "react";
import { OverviewClient } from "./overview/overview-client";
import OverviewLoading from "./overview/loading";

export default function DashboardHomePage() {
  return (
    <Suspense fallback={<OverviewLoading />}>
      <OverviewClient />
    </Suspense>
  );
}
