import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { Building2, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateOrganizationForm } from "./create-organization-form";

export default async function CreateOrganizationPage() {
  const user = await getUser();

  // Redirect to sign-in if not authenticated
  if (!user) {
    redirect("/sign-in?redirect=/organizations/create");
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      {/* Back Link */}
      <Link
        href="/organizations"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Building2 className="h-8 w-8" />
          Create Organization
        </h1>
        <p className="text-muted-foreground mt-1">
          Set up a new organization for your community
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Fill in the details for your new organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>
    </div>
  );
}
