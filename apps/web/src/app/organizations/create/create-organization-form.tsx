"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@trainers/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createOrganization } from "@/actions/organizations";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Generate a URL-friendly slug from a string
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  slug: z
    .string()
    .min(1, "URL slug is required")
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "URL can only contain lowercase letters, numbers, and hyphens"
    ),
  description: z.string().max(500).optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export function CreateOrganizationForm() {
  const router = useRouter();
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  const { isSubmitting } = form.formState;
  const name = form.watch("name");

  // Auto-generate slug from name (unless manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      form.setValue("slug", generateSlug(name));
    }
  }, [name, slugManuallyEdited, form]);

  async function onSubmit(data: OrganizationFormData) {
    const result = await createOrganization({
      name: data.name.trim(),
      slug: data.slug.trim(),
      description: data.description?.trim() || undefined,
    });

    if (result.success) {
      toast.success("Organization created successfully");
      router.push(`/organizations/${result.data.slug}`);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Organization Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="My Organization"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* URL Slug */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  trainers.gg/organizations/
                </span>
                <FormControl>
                  <Input
                    placeholder="my-organization"
                    disabled={isSubmitting}
                    className="flex-1"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setSlugManuallyEdited(true);
                    }}
                  />
                </FormControl>
              </div>
              <FormDescription>
                This will be your organization&apos;s unique URL
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your organization..."
                  disabled={isSubmitting}
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>Optional</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Organization"
          )}
        </Button>
      </form>
    </Form>
  );
}
