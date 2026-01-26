import { SignUpForm } from "@/components/auth/sign-up-form";
import { WaitlistForm } from "@/components/auth/waitlist-form";

export default function SignUpPage() {
  const maintenanceMode = process.env.MAINTENANCE_MODE === "true";

  if (maintenanceMode) {
    return <WaitlistForm />;
  }

  return <SignUpForm />;
}
