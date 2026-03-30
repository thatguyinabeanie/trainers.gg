import { redirect } from "next/navigation";

export default function InvitationsRedirect() {
  redirect("/dashboard/inbox");
}
