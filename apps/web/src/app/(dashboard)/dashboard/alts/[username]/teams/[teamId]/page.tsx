import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ username: string; teamId: string }>;
}) {
  const { teamId } = await params;
  redirect(`/builder/t/acct-${teamId}`);
}
