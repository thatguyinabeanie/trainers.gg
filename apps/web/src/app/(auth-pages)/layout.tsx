import { TopNav } from "@/components/topnav";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { PageContainer } from "@/components/layout/page-container";
import { type ReactNode, Suspense } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AnnouncementBanner />
      <TopNav />
      <main className="flex w-full flex-1 flex-col">
        <PageContainer className="flex min-h-[80vh] flex-col items-center justify-center">
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
      </main>
    </>
  );
}
