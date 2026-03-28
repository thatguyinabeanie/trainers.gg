import { redirect } from "next/navigation";
import { isSiteAdmin } from "@/lib/sudo/server";
import { SudoActivationForm } from "./sudo-activation-form";

export const metadata = {
  title: "Sudo Mode Required - trainers.gg",
  description: "Admin access requires sudo mode activation",
};

export default async function SudoRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  // Verify user is a site admin
  const isAdmin = await isSiteAdmin();
  if (!isAdmin) {
    redirect("/forbidden");
  }

  const params = await searchParams;
  const redirectPath = params.redirect || "/admin";

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center justify-center px-4">
      <div className="w-full space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Sudo Mode Required</h1>
          <p className="text-muted-foreground">
            Admin panel access requires explicit sudo mode activation.
          </p>
        </div>

        <div className="bg-card border-border space-y-4 rounded-lg border p-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">What is Sudo Mode?</h2>
            <p className="text-muted-foreground text-sm">
              Sudo mode is a security feature that requires site administrators
              to explicitly activate elevated permissions before accessing admin
              features. This prevents accidental admin actions and ensures all
              administrative activities are logged.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Security Features</h2>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>All sudo activations are logged in the audit trail</li>
              <li>
                Sessions automatically expire after 30 minutes of inactivity
              </li>
              <li>Visual indicator shows when sudo mode is active</li>
              <li>Can be deactivated at any time from the user menu</li>
            </ul>
          </div>

          <SudoActivationForm redirectPath={redirectPath} />
        </div>
      </div>
    </div>
  );
}
