import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ActiveOrganizationsLoading() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-6">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
