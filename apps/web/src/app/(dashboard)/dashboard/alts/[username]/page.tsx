import { PageHeader } from "@/components/dashboard/page-header";

interface AltDetailPageProps {
  params: Promise<{ username: string }>;
}

export default async function AltDetailPage({ params }: AltDetailPageProps) {
  const { username } = await params;

  return (
    <>
      <PageHeader title={username} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <h1 className="text-xl font-bold tracking-tight">{username}</h1>
        <p className="text-muted-foreground text-sm">
          Alt detail page coming soon.
        </p>
      </div>
    </>
  );
}
