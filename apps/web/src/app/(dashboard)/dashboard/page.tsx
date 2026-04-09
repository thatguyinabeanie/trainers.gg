import { Suspense } from "react";
import { cookies } from "next/headers";

import { HomeClient } from "./home-client";
import HomeLoading from "./home-loading";
import { DASHBOARD_ALT_COOKIE } from "@/components/dashboard/sidebar-helpers";

export default async function DashboardHomePage() {
  const cookieStore = await cookies();
  const selectedAltUsername =
    cookieStore.get(DASHBOARD_ALT_COOKIE)?.value ?? null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Suspense fallback={<HomeLoading />}>
        <HomeClient selectedAltUsername={selectedAltUsername} />
      </Suspense>
    </div>
  );
}
