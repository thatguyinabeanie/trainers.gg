import { Suspense } from "react";
import { OverviewClient } from "./overview-client";
import OverviewLoading from "./loading";

export default function OverviewPage() {
  return (
    <Suspense fallback={<OverviewLoading />}>
      <OverviewClient />
    </Suspense>
  );
}
