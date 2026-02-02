import { type Metadata } from "next";
import { validateInviteToken } from "@/app/invite/actions";
import { InviteSignUp } from "./invite-sign-up";
import { InviteError } from "./invite-error";

export const metadata: Metadata = {
  title: "Accept Invite | trainers.gg",
  description: "Create your trainers.gg account with your beta invite",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await validateInviteToken(token);

  if (!result.valid) {
    return <InviteError reason={result.reason} />;
  }

  return <InviteSignUp email={result.email} token={token} />;
}
