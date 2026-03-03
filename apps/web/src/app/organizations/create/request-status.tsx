import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from "lucide-react";
import type { Tables } from "@trainers/supabase/types";

const COOLDOWN_DAYS = 7;

interface RequestStatusProps {
  request: Tables<"organization_requests">;
}

function isCooldownExpired(reviewedAt: string | null): boolean {
  if (!reviewedAt) return true;
  const cooldownEnd = new Date(reviewedAt);
  cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);
  return new Date() >= cooldownEnd;
}

function getCooldownEndDate(reviewedAt: string): string {
  const cooldownEnd = new Date(reviewedAt);
  cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);
  return cooldownEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RequestStatus({ request }: RequestStatusProps) {
  if (request.status === "pending") {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">
              Your request is pending review
            </h2>
            <Badge
              variant="secondary"
              className="mb-4 border-amber-500/25 bg-amber-500/15 text-amber-600 dark:text-amber-400"
            >
              Pending
            </Badge>
            <div className="text-muted-foreground space-y-1 text-sm">
              <p>
                <span className="text-foreground font-medium">
                  {request.name}
                </span>{" "}
                &middot; trainers.gg/organizations/{request.slug}
              </p>
              <p>
                Submitted{" "}
                {new Date(request.created_at ?? "").toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </p>
            </div>
            <p className="text-muted-foreground mt-4 text-sm">
              We&apos;ll notify you when it&apos;s reviewed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (request.status === "rejected") {
    const cooldownExpired = isCooldownExpired(request.reviewed_at);

    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-500/10">
              <AlertCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">
              Your previous request was not approved
            </h2>
            <Badge
              variant="secondary"
              className="mb-4 border-gray-500/25 bg-gray-500/15 text-gray-600 dark:text-gray-400"
            >
              Not Approved
            </Badge>
            <div className="text-muted-foreground space-y-1 text-sm">
              <p>
                <span className="text-foreground font-medium">
                  {request.name}
                </span>
              </p>
              {request.admin_notes && (
                <p className="mt-2 rounded-lg bg-gray-500/10 px-4 py-2">
                  {request.admin_notes}
                </p>
              )}
            </div>
            {!cooldownExpired && request.reviewed_at && (
              <p className="text-muted-foreground mt-4 text-sm">
                You can submit a new request after{" "}
                {getCooldownEndDate(request.reviewed_at)}.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
