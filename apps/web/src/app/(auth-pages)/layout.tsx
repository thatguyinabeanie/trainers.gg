import { PageContainer } from "@/components/layout/page-container";
import { type ReactNode, Suspense } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <PageContainer
      variant="narrow"
      className="flex min-h-[80vh] flex-col items-center justify-center"
    >
      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            className="flex w-full items-center justify-center py-8"
          >
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
          </div>
        }
      >
        {children}
      </Suspense>
    </PageContainer>
  );
}
