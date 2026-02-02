"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, RefreshCw, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { sendBetaInvite, resendBetaInvite, revokeBetaInvite } from "./actions";

// --- Types ---

interface BetaInvite {
  id: number;
  email: string;
  token: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  converted_user_id: string | null;
  inviter?: { username: string } | null;
}

interface WaitlistEntry {
  id: number;
  email: string;
  created_at: string;
  notified_at: string | null;
  converted_user_id: string | null;
  source: string;
}

// --- Schema ---

const sendInviteSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type SendInviteFormData = z.infer<typeof sendInviteSchema>;

// --- Helpers ---

function getInviteStatus(invite: BetaInvite): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (invite.used_at) {
    return { label: "Used", variant: "secondary" };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { label: "Expired", variant: "destructive" };
  }
  return { label: "Active", variant: "default" };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// --- Component ---

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<BetaInvite[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const supabase = createClient();

  const form = useForm<SendInviteFormData>({
    resolver: zodResolver(sendInviteSchema),
    defaultValues: { email: "" },
  });

  const { isSubmitting } = form.formState;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch invites with inviter username
      const { data: invitesData, error: invitesError } = await supabase
        .from("beta_invites")
        .select("*, inviter:users!beta_invites_invited_by_fkey(username)")
        .order("created_at", { ascending: false });

      if (invitesError) {
        console.error("Error fetching invites:", invitesError);
        // If the join fails, try without the join
        const { data: fallbackData } = await supabase
          .from("beta_invites")
          .select("*")
          .order("created_at", { ascending: false });
        setInvites((fallbackData as BetaInvite[]) ?? []);
      } else {
        setInvites((invitesData as BetaInvite[]) ?? []);
      }

      // Fetch waitlist
      const { data: waitlistData, error: waitlistError } = await supabase
        .from("waitlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (waitlistError) {
        console.error("Error fetching waitlist:", waitlistError);
      }
      setWaitlist((waitlistData as WaitlistEntry[]) ?? []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSendInvite = async (data: SendInviteFormData) => {
    setSendError(null);
    setSendSuccess(null);

    const result = await sendBetaInvite(data.email);

    if (!result.success) {
      setSendError(result.error || "Failed to send invite");
      return;
    }

    setSendSuccess(
      result.error
        ? `Invite created for ${data.email} (email delivery may have failed)`
        : `Invite sent to ${data.email}`
    );
    form.reset();
    await fetchData();
  };

  const handleResend = async (invite: BetaInvite) => {
    setActionLoading(invite.id);
    const result = await resendBetaInvite(invite.id, invite.email);
    if (!result.success) {
      setSendError(result.error || "Failed to resend invite");
    } else {
      setSendSuccess(`New invite sent to ${invite.email}`);
      await fetchData();
    }
    setActionLoading(null);
  };

  const handleRevoke = async (invite: BetaInvite) => {
    setActionLoading(invite.id);
    const result = await revokeBetaInvite(invite.id);
    if (!result.success) {
      setSendError(result.error || "Failed to revoke invite");
    } else {
      setSendSuccess(`Invite for ${invite.email} revoked`);
      await fetchData();
    }
    setActionLoading(null);
  };

  const handleInviteFromWaitlist = (email: string) => {
    form.setValue("email", email);
    // Scroll to top where the form is
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        <div className="bg-muted h-64 w-full animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Send Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="size-5" />
            Send Beta Invite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSendInvite)}
              className="flex flex-col gap-4"
            >
              {sendError && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                  {sendError}
                </div>
              )}
              {sendSuccess && (
                <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
                  {sendSuccess}
                </div>
              )}

              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="user@example.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting}>
                  <Send className="mr-1.5 size-4" />
                  {isSubmitting ? "Sending..." : "Send Invite"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Beta Invites Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Beta Invites ({invites.length})
          </h2>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {invites.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No invites sent yet</p>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => {
                const status = getInviteStatus(invite);
                const isActionLoading = actionLoading === invite.id;

                return (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">
                      {invite.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invite.inviter?.username ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invite.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invite.expires_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!invite.used_at && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleResend(invite)}
                              disabled={isActionLoading}
                              title="Resend invite"
                            >
                              <RefreshCw className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleRevoke(invite)}
                              disabled={isActionLoading}
                              title="Revoke invite"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Waitlist Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Waitlist ({waitlist.length})</h2>

        {waitlist.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No waitlist entries yet</p>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waitlist.map((entry) => {
                const hasInvite = invites.some((i) => i.email === entry.email);
                const isConverted = !!entry.converted_user_id;

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.source}
                    </TableCell>
                    <TableCell>
                      {isConverted ? (
                        <Badge variant="secondary">Converted</Badge>
                      ) : entry.notified_at ? (
                        <Badge variant="outline">Invited</Badge>
                      ) : hasInvite ? (
                        <Badge variant="outline">Invited</Badge>
                      ) : (
                        <Badge variant="secondary">Waiting</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isConverted && !hasInvite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInviteFromWaitlist(entry.email)}
                        >
                          <Send className="mr-1.5 size-3.5" />
                          Invite
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
