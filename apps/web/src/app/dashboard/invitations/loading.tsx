import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function InvitationsLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="mb-2 h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
