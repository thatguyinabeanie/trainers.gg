"use client";

import { useState, useTransition, useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useSupabaseQuery } from "@/lib/supabase";
import { getCurrentUserAlts } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  Swords,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAltAction,
  updateAltAction,
  deleteAltAction,
  setMainAltAction,
} from "@/actions/alts";

export default function AltsPage() {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [editingAlt, setEditingAlt] = useState<number | null>(null);
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

  const handleSetMain = (altId: number) => {
    startTransition(async () => {
      const result = await setMainAltAction(altId);
      if (result.success) {
        toast.success("Main alt updated");
        setRefreshKey((k) => k + 1);
        refetch();
      } else {
        toast.error(result.error);
      }
    });
  };

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
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Alts</h2>
        <p className="text-muted-foreground text-sm">
          Manage your player identities. Alts are used for tournament
          registration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Alts</CardTitle>
              <CardDescription>
                Create and manage your player identities for tournament
                registration
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              disabled={showCreateForm}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Alt
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showCreateForm && (
            <CreateAltForm
              onCreated={() => {
                setShowCreateForm(false);
                setRefreshKey((k) => k + 1);
                refetch();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {!alts || alts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Swords className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
              <h3 className="mb-2 text-lg font-semibold">No alts found</h3>
              <p className="text-muted-foreground text-sm">
                Create an alt to get started with tournament registration
              </p>
            </div>
          ) : (
            alts.map((alt) => {
              const isMain = mainAltId === alt.id;

              if (editingAlt === alt.id) {
                return (
                  <EditAltForm
                    key={alt.id}
                    alt={alt}
                    onSaved={() => {
                      setEditingAlt(null);
                      setRefreshKey((k) => k + 1);
                      refetch();
                    }}
                    onCancel={() => setEditingAlt(null)}
                  />
                );
              }

              return (
                <div
                  key={alt.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {alt.avatar_url && (
                        <AvatarImage
                          src={alt.avatar_url}
                          alt={alt.display_name ?? alt.username}
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {(alt.display_name ?? alt.username)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {alt.display_name ?? alt.username}
                        </p>
                        {isMain && (
                          <Badge
                            variant="outline"
                            className="border-primary/30 bg-primary/10 text-primary text-xs"
                          >
                            <Star className="mr-1 h-3 w-3" />
                            Main
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        @{alt.username}
                      </p>
                      {alt.in_game_name && (
                        <p className="text-muted-foreground text-xs">
                          IGN: {alt.in_game_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isMain && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetMain(alt.id)}
                        disabled={isPending}
                        title="Set as main alt"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAlt(alt.id)}
                      title="Edit alt"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!isMain && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDelete(alt.id, alt.display_name ?? alt.username)
                        }
                        disabled={isPending}
                        className="text-destructive hover:text-destructive"
                        title="Delete alt"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
  const [inGameName, setBattleTag] = useState("");

  const handleSubmit = () => {
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    startTransition(async () => {
      const result = await createAltAction({
        username: username.trim().toLowerCase(),
        inGameName: inGameName.trim() || undefined,
      });

      if (result.success) {
        toast.success("Alt created");
        onCreated();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Create New Alt</p>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="newUsername" className="text-xs">
            Username
          </Label>
          <Input
            id="newUsername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="newBattleTag" className="text-xs">
            IGN (optional)
          </Label>
          <Input
            id="newBattleTag"
            value={inGameName}
            onChange={(e) => setBattleTag(e.target.value)}
            placeholder="Player#1234"
          />
        </div>
      </div>
      <Button size="sm" onClick={handleSubmit} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Create Alt
      </Button>
    </div>
  );
}

function EditAltForm({
  alt,
  onSaved,
  onCancel,
}: {
  alt: {
    id: number;
    username: string;
    display_name: string;
    in_game_name: string | null;
  };
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [inGameName, setBattleTag] = useState(alt.in_game_name ?? "");

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await updateAltAction(alt.id, {
        inGameName: inGameName.trim() || null,
      });

      if (result.success) {
        toast.success("Alt updated");
        onSaved();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Edit @{alt.username}</p>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`editBattleTag-${alt.id}`} className="text-xs">
          IGN
        </Label>
        <Input
          id={`editBattleTag-${alt.id}`}
          value={inGameName}
          onChange={(e) => setBattleTag(e.target.value)}
          placeholder="Player#1234"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
