"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Flag,
  Megaphone,
  Shield,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { getSiteAdmins, getSiteRoles } from "@trainers/supabase";
import {
  createFlagAction,
  updateFlagAction,
  deleteFlagAction,
  createAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
} from "./actions";
import { FlagDialog } from "./flag-dialog";
import { AnnouncementDialog } from "./announcement-dialog";
import type { Json } from "@trainers/supabase/types";

// --- Types ---

interface FeatureFlag {
  id: number;
  key: string;
  description: string | null;
  enabled: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: string;
  start_at: string;
  end_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type AnnouncementTab = "all" | "active" | "scheduled" | "expired";

// --- Helpers ---

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Determine the display status of an announcement based on its
 * is_active flag, start_at, and end_at timestamps.
 */
function getAnnouncementStatus(
  ann: Announcement
): "active" | "scheduled" | "expired" {
  const now = new Date();
  const start = new Date(ann.start_at);
  const end = ann.end_at ? new Date(ann.end_at) : null;

  if (!ann.is_active || (end && end <= now)) {
    return "expired";
  }
  if (start > now) {
    return "scheduled";
  }
  return "active";
}

/** Map announcement type to badge styling. */
const announcementTypeBadgeClass: Record<string, string> = {
  info: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  warning:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  error: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  success:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
};

/** Map announcement status to badge styling. */
const announcementStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
  scheduled: {
    label: "Scheduled",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
  expired: {
    label: "Expired",
    className:
      "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  },
};

// --- Site Roles Section ---

function SiteRolesSection() {
  const { data: siteRoles, isLoading: rolesLoading } = useSupabaseQuery(
    async (supabase) => getSiteRoles(supabase),
    []
  );

  const { data: siteAdmins, isLoading: adminsLoading } = useSupabaseQuery(
    async (supabase) => getSiteAdmins(supabase),
    []
  );

  const isLoading = rolesLoading || adminsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="size-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Roles Table */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Shield className="size-5" />
          Site Roles
        </h2>

        {siteRoles && siteRoles.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Scope</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siteRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {role.description ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{role.scope}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No site roles defined</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Admins Table */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Site Administrators</h3>

        {siteAdmins && siteAdmins.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Granted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siteAdmins.map((admin) => {
                const user =
                  admin.user && typeof admin.user === "object"
                    ? (admin.user as {
                        id: string;
                        email: string | null;
                        username: string | null;
                        first_name: string | null;
                        last_name: string | null;
                        image: string | null;
                      })
                    : null;
                const role =
                  admin.role && typeof admin.role === "object"
                    ? (admin.role as {
                        id: number;
                        name: string;
                        scope: string;
                      })
                    : null;

                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.image ?? undefined} />
                          <AvatarFallback>
                            {user?.username?.charAt(0).toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user?.first_name} {user?.last_name}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            @{user?.username}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user?.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role?.name}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {admin.created_at
                        ? new Date(admin.created_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No site administrators assigned
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// --- Main Component ---

export default function AdminConfigPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // --- Feature Flags State ---
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);

  // Flag dialog state
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  // Flag delete confirmation state
  const [deletingFlag, setDeletingFlag] = useState<FeatureFlag | null>(null);
  const [flagDeleteOpen, setFlagDeleteOpen] = useState(false);

  // --- Announcements State ---
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementTab, setAnnouncementTab] =
    useState<AnnouncementTab>("all");

  // Announcement dialog state
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

  // Announcement delete confirmation state
  const [deletingAnnouncement, setDeletingAnnouncement] =
    useState<Announcement | null>(null);
  const [announcementDeleteOpen, setAnnouncementDeleteOpen] = useState(false);

  // --- Shared State ---
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // --- Data Fetching ---

  const fetchFlags = useCallback(async () => {
    setFlagsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("feature_flags")
        .select("*")
        .order("key", { ascending: true });

      if (fetchError) {
        console.error("Error fetching feature flags:", fetchError);
        setError("Failed to load feature flags");
        return;
      }
      setFlags((data as FeatureFlag[]) ?? []);
    } catch (err) {
      console.error("Error fetching feature flags:", err);
      setError("Failed to load feature flags");
    } finally {
      setFlagsLoading(false);
    }
  }, [supabase]);

  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching announcements:", fetchError);
        setError("Failed to load announcements");
        return;
      }
      setAnnouncements((data as Announcement[]) ?? []);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setError("Failed to load announcements");
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFlags();
    fetchAnnouncements();
  }, [fetchFlags, fetchAnnouncements]);

  // --- Feature Flag Handlers ---

  const handleToggleFlag = async (flag: FeatureFlag) => {
    setActionLoading(flag.id);
    setError(null);

    const result = await updateFlagAction(flag.id, {
      enabled: !flag.enabled,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to toggle flag");
    } else {
      // Optimistic update
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, enabled: !f.enabled } : f))
      );
      router.refresh();
    }
    setActionLoading(null);
  };

  const handleCreateFlag = async (data: {
    key: string;
    description?: string;
    enabled?: boolean;
    metadata?: Json;
  }) => {
    setError(null);
    const result = await createFlagAction(data);
    if (!result.success) {
      setError(result.error ?? "Failed to create flag");
      throw new Error(result.error);
    }
    await fetchFlags();
    router.refresh();
  };

  const handleUpdateFlag = async (data: {
    key: string;
    description?: string;
    enabled?: boolean;
    metadata?: Json;
  }) => {
    if (!editingFlag) return;
    setError(null);
    const result = await updateFlagAction(editingFlag.id, {
      description: data.description,
      enabled: data.enabled,
      metadata: data.metadata,
    });
    if (!result.success) {
      setError(result.error ?? "Failed to update flag");
      throw new Error(result.error);
    }
    await fetchFlags();
    router.refresh();
  };

  const handleDeleteFlag = async () => {
    if (!deletingFlag) return;
    setActionLoading(deletingFlag.id);
    setError(null);

    const result = await deleteFlagAction(deletingFlag.id);
    if (!result.success) {
      setError(result.error ?? "Failed to delete flag");
    } else {
      await fetchFlags();
      router.refresh();
    }
    setActionLoading(null);
    setFlagDeleteOpen(false);
    setDeletingFlag(null);
  };

  // --- Announcement Handlers ---

  const handleCreateAnnouncement = async (data: {
    title: string;
    message: string;
    type: "info" | "warning" | "error" | "success";
    start_at?: string;
    end_at?: string | null;
    is_active?: boolean;
  }) => {
    setError(null);
    // createAnnouncementAction expects end_at as string | undefined (not null)
    const result = await createAnnouncementAction({
      ...data,
      end_at: data.end_at ?? undefined,
    });
    if (!result.success) {
      setError(result.error ?? "Failed to create announcement");
      throw new Error(result.error);
    }
    await fetchAnnouncements();
    router.refresh();
  };

  const handleUpdateAnnouncement = async (data: {
    title: string;
    message: string;
    type: "info" | "warning" | "error" | "success";
    start_at?: string;
    end_at?: string | null;
    is_active?: boolean;
  }) => {
    if (!editingAnnouncement) return;
    setError(null);
    const result = await updateAnnouncementAction(editingAnnouncement.id, data);
    if (!result.success) {
      setError(result.error ?? "Failed to update announcement");
      throw new Error(result.error);
    }
    await fetchAnnouncements();
    router.refresh();
  };

  const handleDeleteAnnouncement = async () => {
    if (!deletingAnnouncement) return;
    setActionLoading(deletingAnnouncement.id);
    setError(null);

    const result = await deleteAnnouncementAction(deletingAnnouncement.id);
    if (!result.success) {
      setError(result.error ?? "Failed to delete announcement");
    } else {
      await fetchAnnouncements();
      router.refresh();
    }
    setActionLoading(null);
    setAnnouncementDeleteOpen(false);
    setDeletingAnnouncement(null);
  };

  // --- Filtered Announcements ---

  const filteredAnnouncements = useMemo(() => {
    if (announcementTab === "all") return announcements;
    return announcements.filter(
      (ann) => getAnnouncementStatus(ann) === announcementTab
    );
  }, [announcements, announcementTab]);

  // --- Loading State ---

  if (flagsLoading && announcementsLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
          <div className="bg-muted h-64 w-full animate-pulse rounded" />
        </div>
        <div className="space-y-4">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
          <div className="bg-muted h-64 w-full animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Global error banner */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* ========== Feature Flags Section ========== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Flag className="size-5" />
            Feature Flags ({flags.length})
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchFlags}>
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingFlag(null);
                setFlagDialogOpen(true);
              }}
            >
              <Plus className="mr-1.5 size-3.5" />
              Create Flag
            </Button>
          </div>
        </div>

        {flags.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No feature flags defined</p>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {flag.key}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {flag.description || "No description"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      size="sm"
                      checked={flag.enabled}
                      onCheckedChange={() => handleToggleFlag(flag)}
                      disabled={actionLoading === flag.id}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Edit flag"
                        onClick={() => {
                          setEditingFlag(flag);
                          setFlagDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Delete flag"
                        onClick={() => {
                          setDeletingFlag(flag);
                          setFlagDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ========== Announcements Section ========== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Megaphone className="size-5" />
            Announcements ({announcements.length})
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAnnouncements}>
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingAnnouncement(null);
                setAnnouncementDialogOpen(true);
              }}
            >
              <Plus className="mr-1.5 size-3.5" />
              Create Announcement
            </Button>
          </div>
        </div>

        {/* Status filter tabs */}
        <Tabs
          value={announcementTab}
          onValueChange={(value) =>
            setAnnouncementTab(value as AnnouncementTab)
          }
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>

          <TabsContent value={announcementTab} className="mt-4">
            {filteredAnnouncements.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {announcementTab === "all"
                      ? "No announcements created"
                      : `No ${announcementTab} announcements`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnnouncements.map((ann) => {
                    const status = getAnnouncementStatus(ann);
                    const statusCfg = announcementStatusConfig[status];
                    const typeCls = announcementTypeBadgeClass[ann.type] ?? "";

                    return (
                      <TableRow key={ann.id}>
                        <TableCell className="max-w-xs truncate font-medium">
                          {ann.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(typeCls)}>
                            {ann.type.charAt(0).toUpperCase() +
                              ann.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {statusCfg && (
                            <Badge
                              variant="outline"
                              className={cn(statusCfg.className)}
                            >
                              {statusCfg.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateTime(ann.start_at)}
                          {ann.end_at && (
                            <> &ndash; {formatDateTime(ann.end_at)}</>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Edit announcement"
                              onClick={() => {
                                setEditingAnnouncement(ann);
                                setAnnouncementDialogOpen(true);
                              }}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Delete announcement"
                              onClick={() => {
                                setDeletingAnnouncement(ann);
                                setAnnouncementDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ========== Site Roles Section ========== */}
      <SiteRolesSection />

      {/* ========== Flag Dialog (Create/Edit) ========== */}
      <FlagDialog
        flag={editingFlag}
        open={flagDialogOpen}
        onOpenChange={setFlagDialogOpen}
        onSubmit={editingFlag ? handleUpdateFlag : handleCreateFlag}
      />

      {/* ========== Flag Delete Confirmation ========== */}
      <AlertDialog open={flagDeleteOpen} onOpenChange={setFlagDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Flag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the flag{" "}
              <span className="font-mono font-medium">{deletingFlag?.key}</span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteFlag}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========== Announcement Dialog (Create/Edit) ========== */}
      <AnnouncementDialog
        announcement={editingAnnouncement}
        open={announcementDialogOpen}
        onOpenChange={setAnnouncementDialogOpen}
        onSubmit={
          editingAnnouncement
            ? handleUpdateAnnouncement
            : handleCreateAnnouncement
        }
      />

      {/* ========== Announcement Delete Confirmation ========== */}
      <AlertDialog
        open={announcementDeleteOpen}
        onOpenChange={setAnnouncementDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the announcement{" "}
              <span className="font-medium">
                &ldquo;{deletingAnnouncement?.title}&rdquo;
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteAnnouncement}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
