"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import type { Id } from "@trainers/backend/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, UserCheck, UserX, Mail } from "lucide-react";

interface Registration {
  _id: Id<"tournamentRegistrations">;
  tournamentId: Id<"tournaments">;
  profileId: Id<"profiles">;
  status: "pending" | "confirmed" | "waitlist" | "declined";
  registeredAt: number;
  teamName?: string;
  notes?: string;
  teamId?: Id<"teams">;
  rentalTeamPhotoUrl?: string;
  rentalTeamPhotoKey?: string;
  rentalTeamPhotoUploadedAt?: number;
  rentalTeamPhotoVerified: boolean;
  rentalTeamPhotoVerifiedBy?: Id<"profiles">;
  rentalTeamPhotoVerifiedAt?: number;
  profile?: {
    _id: Id<"profiles">;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  team?: {
    _id: Id<"teams">;
    name: string;
  };
}

interface TournamentRegistrationsProps {
  tournament: {
    _id: Id<"tournaments">;
    status: string;
    rentalTeamPhotosEnabled?: boolean;
  };
}

export function TournamentRegistrations({
  tournament,
}: TournamentRegistrationsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const registrations = useQuery(api.tournaments.getRegistrations, {
    tournamentId: tournament._id,
  }) as Registration[] | undefined;

  const filteredRegistrations =
    registrations?.filter(
      (reg) =>
        reg.profile?.displayName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        reg.teamName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "waitlist":
        return "bg-blue-100 text-blue-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Registrations</h2>
          <p className="text-muted-foreground">
            Manage player registrations for this tournament
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {registrations?.filter((r) => r.status === "confirmed").length ||
                0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {registrations?.filter((r) => r.status === "pending").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Waitlist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {registrations?.filter((r) => r.status === "waitlist").length ||
                0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Player Registrations</CardTitle>
          <CardDescription>
            {filteredRegistrations.length} of {registrations?.length || 0}{" "}
            registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRegistrations.length === 0 ? (
            <div className="py-8 text-center">
              <UserCheck className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
              <h3 className="mb-2 text-lg font-semibold">
                No registrations yet
              </h3>
              <p className="text-muted-foreground">
                Players will appear here once they register for the tournament.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Team Photo</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((registration) => (
                  <TableRow key={registration._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={registration.profile?.avatarUrl} />
                          <AvatarFallback>
                            {registration.profile?.displayName?.charAt(0) ||
                              "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {registration.profile?.displayName ||
                              "Unknown Player"}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            @{registration.profile?.username || "unknown"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {registration.teamName || (
                        <span className="text-muted-foreground italic">
                          No team name
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(registration.status)}>
                        {registration.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(registration.registeredAt)}
                    </TableCell>
                    <TableCell>
                      {tournament.rentalTeamPhotosEnabled ? (
                        registration.rentalTeamPhotoVerified ? (
                          <Badge className="bg-green-100 text-green-800">
                            Verified
                          </Badge>
                        ) : registration.rentalTeamPhotoUrl ? (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not uploaded</Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Confirm Registration
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
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
    </div>
  );
}
