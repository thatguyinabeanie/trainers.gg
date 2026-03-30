import { Suspense } from "react";
import { OverviewClient } from "./overview/overview-client";
import OverviewLoading from "./overview/loading";
import { PageHeader } from "@/components/dashboard/page-header";

export default function DashboardHomePage() {
  return (
    <>
      <PageHeader title="Home" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Suspense fallback={<OverviewLoading />}>
          <OverviewClient />
        </Suspense>
      </div>
    </>
  );
}
