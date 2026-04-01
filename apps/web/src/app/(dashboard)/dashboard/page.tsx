import { Suspense } from "react";
import { cookies } from "next/headers";
import { HomeClient } from "./home-client";
import HomeLoading from "./home-loading";
import { PageHeader } from "@/components/dashboard/page-header";
import { DASHBOARD_ALT_COOKIE } from "@/components/dashboard/sidebar-helpers";

export default async function DashboardHomePage() {
  const cookieStore = await cookies();
  const selectedAltUsername =
    cookieStore.get(DASHBOARD_ALT_COOKIE)?.value ?? null;

  return (
    <>
      <PageHeader title="Home" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <Suspense fallback={<HomeLoading />}>
          <HomeClient selectedAltUsername={selectedAltUsername} />
        </Suspense>
      </div>
    </>
  );
}
