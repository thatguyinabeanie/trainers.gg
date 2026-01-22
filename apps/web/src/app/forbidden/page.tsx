import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="bg-destructive/10 mb-6 inline-flex rounded-full p-4">
          <ShieldX className="text-destructive h-12 w-12" />
        </div>
        <h1 className="mb-2 text-4xl font-bold tracking-tight">
          403 - Access Denied
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md text-lg">
          You don&apos;t have permission to access this page. This area is
          restricted to authorized users only.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition-colors"
          >
            Go to Homepage
          </Link>
          <Link
            href="/sign-in"
            className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
