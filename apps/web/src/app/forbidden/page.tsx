import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageContainer } from "@/components/layout/page-container";
import { ShieldOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <PageContainer variant="narrow">
      <div className="flex min-h-[50vh] items-center justify-center">
        <Alert className="max-w-md">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">
              You don&apos;t have permission to access this page. If you believe
              this is an error, please contact a site administrator.
            </p>
            <Link href="/">
              <Button variant="outline" size="sm">
                Return Home
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    </PageContainer>
  );
}
