import { redirect } from "next/navigation";
import { getUser, createClient } from "@/lib/supabase/server";
import { getMyOrganizationRequest } from "@trainers/supabase";
import Link from "next/link";
import { Building2, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequestOrganizationForm } from "./request-organization-form";
import { RequestStatus } from "./request-status";

const COOLDOWN_DAYS = 7;

function isCooldownExpired(reviewedAt: string | null): boolean {
  if (!reviewedAt) return true;
  const cooldownEnd = new Date(reviewedAt);
  cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);
  return new Date() >= cooldownEnd;
}

export default async function CreateOrganizationPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/organizations/create");
  }

  const supabase = await createClient();
  const request = await getMyOrganizationRequest(supabase);

  // Show form if no request, or rejected with expired cooldown
  const showForm =
    !request ||
    (request.status === "rejected" && isCooldownExpired(request.reviewed_at));
  const showStatus = !!request && !showForm;

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Link
        href="/organizations"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>

      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Building2 className="h-8 w-8" />
          Request an Organization
        </h1>
        <p className="text-muted-foreground mt-1">
          Submit a request to create your community
        </p>
      </div>

      {showStatus && <RequestStatus request={request} />}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Fill in the details for your organization request
            </CardDescription>
          </CardHeader>
          <CardContent>
            {request?.status === "rejected" && (
              <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                Your previous request for &ldquo;{request.name}&rdquo; was not
                approved.
                {request.admin_notes && <> Reason: {request.admin_notes}</>}
              </div>
            )}
            <RequestOrganizationForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
