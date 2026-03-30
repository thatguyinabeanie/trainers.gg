import { redirect } from "next/navigation";

export default async function OrganizationDetailRedirect({
  params,
}: {
  params: Promise<{ communitySlug: string }>;
}) {
  const { communitySlug } = await params;
  redirect(`/communities/${communitySlug}`);
}
