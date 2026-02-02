import { PageContainer } from "@/components/layout/page-container";
import { type ReactNode, Suspense } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <PageContainer
      variant="narrow"
      className="flex min-h-[80vh] flex-col items-center justify-center"
    >
      <Suspense>{children}</Suspense>
    </PageContainer>
  );
}
