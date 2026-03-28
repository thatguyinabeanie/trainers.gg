import { redirect } from "next/navigation";

export default async function OrganizationDetailRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug: communitySlug } = await params;
  redirect(`/communities/${communitySlug}`);
}
