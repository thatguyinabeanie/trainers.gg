"use client";

import { useState, useEffect, useRef } from "react";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import {
  getTournamentRegistrations,
  getTournamentInvitationsSent,
} from "@trainers/supabase";
import { getErrorMessage } from "@trainers/utils";
import { InviteForm } from "@/components/tournaments/invite/invite-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  Mail,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  forceCheckInPlayer,
  removePlayerFromTournament,
  bulkForceCheckIn,
  bulkRemovePlayers,
} from "@/actions/tournaments";
import {
  RealtimeStatusBadge,
  type RealtimeStatus,
} from "./realtime-status-badge";

// Map invitation statuses to StatusBadge Status values + human-readable labels
const defaultInvitationBadge = {
  status: "pending" as Status,
  label: "Pending",
};
const invitationStatusConfig: Record<
  string,
  { status: Status; label: string }
> = {
  pending: defaultInvitationBadge,
  accepted: { status: "registered", label: "Accepted" },
  declined: { status: "declined", label: "Declined" },
  expired: { status: "cancelled", label: "Expired" },
};

const getInvitationBadge = (status: string | null) =>
  invitationStatusConfig[status ?? "pending"] ?? defaultInvitationBadge;

interface TournamentRegistrationsProps {
  tournament: {
    id: number;
    status: string;
    maxParticipants?: number;
  };
}

export function TournamentRegistrations({
  tournament,
}: TournamentRegistrationsProps) {
  const supabase = useSupabase();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [invitationsRefreshKey, setInvitationsRefreshKey] = useState(0);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connected");
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const invRefreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced refresh trigger (500ms delay to batch bulk operations)
  const triggerRefresh = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshKey((k) => k + 1);
    }, 500);
  };

  const triggerInvitationsRefresh = () => {
    if (invRefreshTimeoutRef.current) {
      clearTimeout(invRefreshTimeoutRef.current);
    }
    invRefreshTimeoutRef.current = setTimeout(() => {
      setInvitationsRefreshKey((k) => k + 1);
    }, 500);
  };

  // Realtime: registrations
  useEffect(() => {
    const channel = supabase
      .channel(`registrations-${tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_registrations",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => {
          triggerRefresh();
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CLOSED") {
          setRealtimeStatus("disconnected");
        } else if (err) {
          console.error("[Realtime] registrations error:", err);
          setRealtimeStatus("error");
        }
      });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [supabase, tournament.id]);

  // Realtime: invitations (triggers both refreshes so capacity recalculates)
  useEffect(() => {
    const channel = supabase
      .channel(`invitations-${tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_invitations",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => {
          triggerRefresh();
          triggerInvitationsRefresh();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("[Realtime] invitations error:", err);
          setRealtimeStatus("error");
        }
      });

    return () => {
      if (invRefreshTimeoutRef.current) {
        clearTimeout(invRefreshTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [supabase, tournament.id]);

  const {
    data: registrations,
    error: registrationsError,
    refetch,
  } = useSupabaseQuery(
    (supabase) => getTournamentRegistrations(supabase, tournament.id),
    [tournament.id, refreshKey]
  );

  const {
    data: invitationsSent,
    error: invitationsError,
    refetch: refetchInvitations,
  } = useSupabaseQuery(
    (supabase) => getTournamentInvitationsSent(supabase, tournament.id),
    [tournament.id, invitationsRefreshKey]
  );

  const now = new Date();
  const registeredCount =
    registrations?.filter((r) => r.status === "registered").length ?? 0;
  const pendingNonExpiredCount =
    invitationsSent?.filter(
      (inv) =>
        inv.status === "pending" &&
        (!inv.expires_at || new Date(inv.expires_at) > now)
    ).length ?? 0;
  const availableSpots =
    tournament.maxParticipants != null
      ? Math.max(
          tournament.maxParticipants - registeredCount - pendingNonExpiredCount,
          0
        )
      : null;

  const filteredRegistrations =
    registrations?.filter(
      (reg) =>
        reg.alt?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.team_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleSelection = (registrationId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(registrationId)) {
      newSelected.delete(registrationId);
    } else {
      newSelected.add(registrationId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRegistrations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRegistrations.map((r) => r.id)));
    }
  };

  const handleForceCheckIn = async (registrationId: number) => {
    setIsProcessing(true);
    try {
      const result = await forceCheckInPlayer(registrationId);
      if (result.success) {
        toast.success("Player checked in successfully");
        refetch();
      } else {
        toast.error(result.error || "Failed to check in player");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "An unexpected error occurred"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePlayer = async (registrationId: number) => {
    if (!confirm("Are you sure you want to remove this player?")) return;

    setIsProcessing(true);
    try {
      // TODO: Replace with DropPlayerDialog (TGG-313 Task 6/7)
      const result = await removePlayerFromTournament(registrationId, "other");
      if (result.success) {
        toast.success("Player removed successfully");
        refetch();
      } else {
        toast.error(result.error || "Failed to remove player");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "An unexpected error occurred"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkForceCheckIn = async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      const result = await bulkForceCheckIn(Array.from(selectedIds));
      if (result.success) {
        toast.success(
          `${result.data.checkedIn} player(s) checked in${result.data.failed > 0 ? `, ${result.data.failed} failed` : ""}`
        );
        setSelectedIds(new Set());
        refetch();
      } else {
        toast.error(result.error || "Failed to check in players");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "An unexpected error occurred"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(`Are you sure you want to remove ${selectedIds.size} player(s)?`)
    )
      return;

    setIsProcessing(true);
    try {
      // TODO: Replace with DropPlayerDialog (TGG-313 Task 6/7)
      const result = await bulkRemovePlayers(Array.from(selectedIds), "other");
      if (result.success) {
        toast.success(
          `${result.data.removed} player(s) removed${result.data.failed > 0 ? `, ${result.data.failed} failed` : ""}`
        );
        setSelectedIds(new Set());
        refetch();
      } else {
        toast.error(result.error || "Failed to remove players");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "An unexpected error occurred"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {(registrationsError || invitationsError) && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          Failed to load data. Please refresh the page.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Registrations</h2>
          <p className="text-muted-foreground">
            Manage player registrations and invitations
          </p>
        </div>
        <RealtimeStatusBadge status={realtimeStatus} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {registrations?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {registrations?.filter((r) => r.status === "checked_in").length ||
                0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Not Checked In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {registrations?.filter(
                (r) =>
                  r.status === "registered" ||
                  r.status === "confirmed" ||
                  r.status === "pending" ||
                  r.status === "waitlist"
              ).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dropped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {registrations?.filter((r) => r.status === "dropped").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="registered">
        <TabsList>
          <TabsTrigger value="registered">
            Registered ({registrations?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({invitationsSent?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Registered tab */}
        <TabsContent value="registered" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Player Registrations</CardTitle>
                  <CardDescription>
                    {filteredRegistrations.length} of{" "}
                    {registrations?.length || 0} registrations
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkForceCheckIn}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="mr-2 h-4 w-4" />
                        )}
                        Force Check-in ({selectedIds.size})
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkRemove}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <UserX className="mr-2 h-4 w-4" />
                        )}
                        Remove ({selectedIds.size})
                      </Button>
                    </>
                  )}
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder="Search players..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64 pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRegistrations.length === 0 ? (
                <div className="py-8 text-center">
                  <UserCheck className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No registrations yet
                  </h3>
                  <p className="text-muted-foreground">
                    Players will appear here once they register for the
                    tournament.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            filteredRegistrations.length > 0 &&
                            selectedIds.size === filteredRegistrations.length
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all registrations"
                        />
                      </TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map((registration) => (
                      <TableRow key={registration.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(registration.id)}
                            onCheckedChange={() =>
                              toggleSelection(registration.id)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={registration.alt?.avatar_url ?? undefined}
                              />
                              <AvatarFallback>
                                {registration.alt?.username?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {registration.alt?.username || "Unknown Player"}
                              </div>
                              <div className="text-muted-foreground text-sm">
                                @{registration.alt?.username || "unknown"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {registration.team_name || (
                            <span className="text-muted-foreground italic">
                              No team name
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={
                              (registration.status ?? "pending") as Status
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {formatDate(registration.registered_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={<Button variant="ghost" size="sm" />}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleForceCheckIn(registration.id)
                                }
                                disabled={
                                  isProcessing ||
                                  registration.status === "checked_in"
                                }
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Force Check-in
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  handleRemovePlayer(registration.id)
                                }
                                disabled={isProcessing}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Remove Player
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations tab */}
        <TabsContent value="invitations" keepMounted className="mt-4 space-y-6">
          {/* Capacity bar */}
          {tournament.maxParticipants != null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {registeredCount} of {tournament.maxParticipants} spots filled
                  {pendingNonExpiredCount > 0 &&
                    ` (${pendingNonExpiredCount} pending invitation${pendingNonExpiredCount !== 1 ? "s" : ""})`}
                  {" · "}
                  <span className="font-medium">
                    {availableSpots} spot
                    {availableSpots !== 1 ? "s" : ""} available
                  </span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Invite form */}
          <InviteForm
            tournamentId={tournament.id}
            tournamentName="this tournament"
            maxInvitations={availableSpots ?? undefined}
            onSuccess={() => {
              refetchInvitations();
              triggerRefresh();
            }}
          />

          {/* Sent invitations table */}
          <Card>
            <CardHeader>
              <CardTitle>Sent Invitations</CardTitle>
              <CardDescription>
                {invitationsSent?.length ?? 0} invitation(s) sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!invitationsSent || invitationsSent.length === 0 ? (
                <div className="py-8 text-center">
                  <Mail className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No invitations sent
                  </h3>
                  <p className="text-muted-foreground">
                    Use the form above to invite players.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Invited At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitationsSent.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <span className="font-medium">
                            {inv.invitedPlayer?.username ?? "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={getInvitationBadge(inv.status).status}
                            label={getInvitationBadge(inv.status).label}
                          />
                        </TableCell>
                        <TableCell>{formatDate(inv.expires_at)}</TableCell>
                        <TableCell>{formatDate(inv.invited_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
