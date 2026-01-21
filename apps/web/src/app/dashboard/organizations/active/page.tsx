import { Suspense } from "react";
import { ActiveOrganizationsClient } from "./active-organizations-client";
import ActiveOrganizationsLoading from "./loading";

export default function ActiveOrganizationsPage() {
  return (
    <Suspense fallback={<ActiveOrganizationsLoading />}>
      <ActiveOrganizationsClient />
    </Suspense>
  );
}
