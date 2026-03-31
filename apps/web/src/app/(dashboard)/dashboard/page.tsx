import { Suspense } from "react";
import { HomeClient } from "./home-client";
import HomeLoading from "./home-loading";
import { PageHeader } from "@/components/dashboard/page-header";

export default function DashboardHomePage() {
  return (
    <>
      <PageHeader title="Home" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <Suspense fallback={<HomeLoading />}>
          <HomeClient />
        </Suspense>
      </div>
    </>
  );
}
