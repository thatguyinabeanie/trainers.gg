"use client";

import { useState, useTransition, useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useSupabaseQuery } from "@/lib/supabase";
import { getCurrentUserAlts } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Star,
  X,
  Users,
  Trophy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { createAltAction, deleteAltAction } from "@/actions/alts";
import { SpritePicker } from "@/components/profile/sprite-picker";

export default function AltsPage() {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const altsQueryFn = useCallback(
    (client: TypedSupabaseClient) => getCurrentUserAlts(client),
    []
  );
  const {
    data: alts,
    isLoading,
    refetch,
  } = useSupabaseQuery(altsQueryFn, ["alts", refreshKey]);

  // Get user's main_alt_id
  const mainAltQueryFn = useCallback(
    async (client: TypedSupabaseClient) => {
      if (!user) return null;
      const { data } = await client
        .from("users")
        .select("main_alt_id")
        .eq("id", user.id)
        .single();
      return data?.main_alt_id ?? null;
    },
    [user]
  );
  const { data: mainAltId } = useSupabaseQuery(mainAltQueryFn, [
    "mainAlt",
    user?.id,
    refreshKey,
  ]);

  const handleDelete = (altId: number, altName: string) => {
    if (mainAltId === altId) {
      toast.error("Cannot delete your main alt. Set a different main first.");
      return;
    }

    if (!confirm(`Delete alt "${altName}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteAltAction(altId);
      if (result.success) {
        toast.success("Alt deleted");
        setRefreshKey((k) => k + 1);
        refetch();
      } else {
        toast.error(result.error);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="from-primary/5 absolute inset-0 rounded-lg bg-gradient-to-r via-transparent to-transparent" />
        <div className="relative px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Player Identities
              </h2>
              <p className="text-muted-foreground mt-1 font-medium">
                Manage your alts • Tournament Registration
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setShowCreateForm(true)}
              disabled={showCreateForm}
              className="gap-2"
            >
              <Plus className="size-4" />
              New Alt
            </Button>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <CreateAltForm
            onCreated={() => {
              setShowCreateForm(false);
              setRefreshKey((k) => k + 1);
              refetch();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Alts Table */}
      {!alts || alts.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
              <Users className="text-primary size-8" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">No alts yet</h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
              Create your first player identity to register for tournaments and
              track your competitive journey
            </p>
            <Button
              className="mt-6 gap-2"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="size-4" />
              Create Your First Alt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: Card View */}
          <div className="divide-y rounded-lg border md:hidden">
            {alts.map((alt) => {
              const isMain = mainAltId === alt.id;
              return (
                <div
                  key={alt.id}
                  className="hover:bg-muted/50 flex items-center gap-3 p-4 transition-colors"
                >
                  {/* Avatar (clickable) */}
                  <Popover key={`mobile-${alt.id}-${refreshKey}`}>
                    <PopoverTrigger
                      title="Change avatar"
                      className="group/avatar relative shrink-0 cursor-pointer"
                    >
                      <div className="relative overflow-hidden rounded-full">
                        <Avatar className="ring-primary/10 size-11 ring-2">
                          {alt.avatar_url && (
                            <AvatarImage
                              src={alt.avatar_url}
                              alt={alt.username}
                            />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {alt.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/avatar:bg-black/40">
                          <Pencil className="size-4 text-white opacity-0 drop-shadow-md transition-opacity group-hover/avatar:opacity-100" />
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-2">
                      <SpritePicker
                        altId={alt.id}
                        currentAvatarUrl={alt.avatar_url}
                        onAvatarChange={() => {
                          setRefreshKey((k) => k + 1);
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="truncate font-mono text-[15px] font-semibold">
                        @{alt.username}
                      </p>
                      {isMain && (
                        <Badge className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Star className="size-3 fill-current" />
                          Main
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      <Trophy className="size-3.5" />0 tournaments · 0-0
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-1">
                    {!isMain && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(alt.id, alt.username)}
                        disabled={isPending}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden rounded-lg border md:block">
            <div className="relative w-full overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="text-muted-foreground h-12 px-4 text-left align-middle text-xs font-medium tracking-wider uppercase">
                      Handle
                    </th>
                    <th className="text-muted-foreground hidden h-12 px-4 text-left align-middle text-xs font-medium tracking-wider uppercase sm:table-cell">
                      Stats
                    </th>
                    <th className="text-muted-foreground h-12 px-4 text-right align-middle text-xs font-medium tracking-wider uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alts.map((alt) => {
                    const isMain = mainAltId === alt.id;

                    return (
                      <tr
                        key={alt.id}
                        className="group hover:bg-muted/50 border-b transition-colors last:border-0"
                      >
                        {/* Alt Column */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-3">
                            <Popover key={`desktop-${alt.id}-${refreshKey}`}>
                              <PopoverTrigger
                                title="Change avatar"
                                className="group/avatar relative shrink-0 cursor-pointer"
                              >
                                <div className="relative overflow-hidden rounded-full">
                                  <Avatar className="ring-primary/10 size-11 ring-2">
                                    {alt.avatar_url && (
                                      <AvatarImage
                                        src={alt.avatar_url}
                                        alt={alt.username}
                                      />
                                    )}
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                      {alt.username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/avatar:bg-black/40">
                                    <Pencil className="size-4 text-white opacity-0 drop-shadow-md transition-opacity group-hover/avatar:opacity-100" />
                                  </div>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent
                                align="start"
                                className="w-auto p-2"
                              >
                                <SpritePicker
                                  altId={alt.id}
                                  currentAvatarUrl={alt.avatar_url}
                                  onAvatarChange={() => {
                                    setRefreshKey((k) => k + 1);
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate font-mono text-[15px] font-semibold">
                                @{alt.username}
                              </p>
                              {isMain && (
                                <Badge className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  <Star className="size-3 fill-current" />
                                  Main
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Stats Column - Hidden on mobile */}
                        <td className="hidden px-4 py-3 align-middle sm:table-cell">
                          <div className="text-muted-foreground flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-1.5">
                              <Trophy className="text-primary size-3.5" />
                              <span className="text-foreground font-mono font-medium">
                                0
                              </span>
                              <span>tournaments</span>
                            </div>
                            <span>•</span>
                            <span className="font-mono">0-0</span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex justify-end gap-1">
                            {!isMain && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDelete(alt.id, alt.username)
                                }
                                disabled={isPending}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                title="Delete alt"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Trophy className="text-primary size-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold">What are Alts?</h3>
              <p className="text-muted-foreground text-sm">
                Alts are player identities you use for tournament registration.
                Each alt can register independently for tournaments, letting you
                compete with different teams or strategies. Your{" "}
                <span className="text-foreground font-medium">main alt</span>{" "}
                matches your account username and serves as your primary
                identity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateAltForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState("");

  const handleSubmit = () => {
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    startTransition(async () => {
      const result = await createAltAction({
        username: username.trim().toLowerCase(),
      });

      if (result.success) {
        toast.success("Alt created successfully!");
        onCreated();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
              <Plus className="text-primary size-5" />
            </div>
            <div>
              <h3 className="font-semibold">Create New Alt</h3>
              <p className="text-muted-foreground text-sm">
                Add a new player identity
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="newUsername" className="text-sm font-medium">
            Username <span className="text-destructive">*</span>
          </Label>
          <Input
            id="newUsername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="font-mono"
          />
          <p className="text-muted-foreground text-xs">
            Used for tournament registration
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="size-4" />
                Create Alt
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
