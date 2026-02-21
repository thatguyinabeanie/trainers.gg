"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@trainers/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";

interface LinkBlueskyClientProps {
  did: string;
  returnUrl?: string;
}

const linkBlueskySchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LinkBlueskyFormData = z.infer<typeof linkBlueskySchema>;

export function LinkBlueskyClient({ did, returnUrl }: LinkBlueskyClientProps) {
  const router = useRouter();
  const { signInWithEmail } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<LinkBlueskyFormData>({
    resolver: zodResolver(linkBlueskySchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: LinkBlueskyFormData) => {
    setError(null);

    try {
      const { error: signInError } = await signInWithEmail(
        data.email,
        data.password
      );

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Now link the Bluesky account to this user
      const response = await fetch("/api/oauth/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Failed to link Bluesky account");
        return;
      }

      setSuccess(true);

      // Redirect after successful link
      setTimeout(() => {
        router.push(returnUrl || "/");
      }, 1500);
    } catch {
      setError("An unexpected error occurred");
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-primary">Account Linked</CardTitle>
          <CardDescription>
            Your Bluesky account has been linked successfully. Redirecting...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Link Bluesky Account</CardTitle>
        <CardDescription>
          We found your Bluesky identity but it&apos;s not linked to a
          trainers.gg account yet.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
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
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && <p className="text-destructive text-sm">{error}</p>}

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    "Sign In & Link Account"
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm">
                Create a new trainers.gg account and link your Bluesky identity.
              </p>
              <Link
                href={`/sign-up?link_did=${encodeURIComponent(did)}${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
                className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-all"
              >
                Create New Account
              </Link>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-xs">
            Bluesky DID: <code className="text-foreground/70">{did}</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
