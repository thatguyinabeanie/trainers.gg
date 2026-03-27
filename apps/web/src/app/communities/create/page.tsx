import { redirect } from "next/navigation";
import { getUser, createClient } from "@/lib/supabase/server";
import { getMyOrganizationRequest } from "@trainers/supabase";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
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
    redirect("/sign-in?redirect=/communities/create");
  }

  const supabase = await createClient();
  const request = await getMyOrganizationRequest(supabase);

  // Show form if no request, or rejected with expired cooldown
  const showForm =
    !request ||
    (request.status === "rejected" && isCooldownExpired(request.reviewed_at));
  const showStatus = !!request && !showForm;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/communities"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Communities
      </Link>

      <div className="mb-6 flex items-start gap-4">
        <div className="bg-primary/10 rounded-full p-3">
          <Building2 className="text-primary h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Request a Community</h1>
          <p className="text-muted-foreground mt-1">
            Submit a request to list your community on trainers.gg
          </p>
        </div>
      </div>

      {/* Review disclaimer — outside the form */}
      {showForm && (
        <div className="bg-primary/5 border-primary/20 mb-8 rounded-lg border-l-4 p-5 text-sm">
          <p className="font-medium">Before you apply</p>
          <p className="text-muted-foreground mt-2">
            Every request is reviewed by our team. We look at your community
            spaces — especially your Discord server — to make sure they are
            welcoming, inclusive, and free of toxicity, harassment, or bigotry.
          </p>
          <p className="text-muted-foreground mt-3">
            Our full community standards are still being finalized, but the
            short version is simple:{" "}
            <strong className="text-foreground">
              don&apos;t be a bigot, don&apos;t be a jerk, and be kind to others
            </strong>
            .
          </p>
          <ul className="text-muted-foreground mt-3 list-inside list-disc space-y-1">
            <li>
              Requests may be{" "}
              <strong className="text-foreground">approved or declined</strong>{" "}
              at our discretion.
            </li>
            <li>
              Organizations may be{" "}
              <strong className="text-foreground">suspended at any time</strong>{" "}
              if they no longer meet our community standards.
            </li>
            <li>
              Follower count, server size, and social reach{" "}
              <strong className="text-foreground">do not affect</strong> our
              decision.
            </li>
          </ul>
          <p className="text-muted-foreground mt-3">
            We want trainers.gg to be a place where every trainer feels welcome.
          </p>
        </div>
      )}

      {showStatus && <RequestStatus request={request} />}

      {showForm && (
        <>
          {request?.status === "rejected" && (
            <div className="mb-6 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
              Your previous request for &ldquo;{request.name}&rdquo; was not
              approved.
              {request.admin_notes && <> Reason: {request.admin_notes}</>}
            </div>
          )}
          <RequestOrganizationForm />
        </>
      )}
    </div>
  );
}
