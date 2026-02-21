"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@trainers/validators";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { joinWaitlist } from "@/app/(auth-pages)/actions";

const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

export function WaitlistForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      email: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: WaitlistFormData) => {
    setError(null);

    try {
      const result = await joinWaitlist(data.email);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">You&apos;re on the list!</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-center">
          <p className="text-muted-foreground">
            Thanks for your interest in trainers.gg! We&apos;ll notify you as
            soon as we&apos;re ready to launch.
          </p>
          <p className="text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Join the Waitlist</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-muted-foreground text-center">
          We&apos;re currently in private beta. Sign up to be notified when we
          launch publicly.
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
