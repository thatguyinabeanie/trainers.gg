"use client";

import { useState, useTransition, useCallback } from "react";
import { useAuth, getUserDisplayName } from "@/components/auth/auth-provider";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  Swords,
  Loader2,
  Save,
  Mail,
  Lock,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAltAction,
  updateAltAction,
  updateProfileAction,
  deleteAltAction,
  setMainAltAction,
} from "@/actions/alts";

export function SettingsContent() {
  return (
    <main className="container mx-auto max-w-screen-lg px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="alts" className="gap-2">
            <Swords className="h-4 w-4" />
            Alts
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <Shield className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="alts">
          <AltsSettings />
        </TabsContent>

        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function ProfileSettings() {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const displayName = user ? getUserDisplayName(user) : "";
  const avatarUrl =
    user?.profile?.avatarUrl ??
    (user?.user_metadata?.avatar_url as string | undefined);

  const [name, setName] = useState(displayName);
  const [bio, setBio] = useState(user?.profile?.bio ?? "");

  const handleSave = () => {
    if (!user?.profile?.id) {
      toast.error("No profile found");
      return;
    }

    startTransition(async () => {
      const result = await updateProfileAction(user.profile!.id, {
        displayName: name,
        bio: bio || undefined,
      });

      if (result.success) {
        toast.success("Profile updated");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your public profile information visible to other players
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{displayName}</p>
            <p className="text-muted-foreground text-sm">
              @{user?.profile?.username ?? user?.user_metadata?.username}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others about yourself..."
            rows={3}
          />
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}

function AltsSettings() {
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
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Alts</CardTitle>
              <CardDescription>
                Manage your player identities. Alts are used for tournament
                registration.
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
            <p className="text-muted-foreground text-sm">
              No alts found. Create one to get started.
            </p>
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
  const [displayName, setDisplayName] = useState("");
  const [inGameName, setBattleTag] = useState("");

  const handleSubmit = () => {
    if (!username.trim() || !displayName.trim()) {
      toast.error("Username and display name are required");
      return;
    }

    startTransition(async () => {
      const result = await createAltAction({
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
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
          <Label htmlFor="newDisplayName" className="text-xs">
            Display Name
          </Label>
          <Input
            id="newDisplayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display Name"
          />
        </div>
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
    bio: string | null;
  };
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(alt.display_name);
  const [inGameName, setBattleTag] = useState(alt.in_game_name ?? "");
  const [bio, setBio] = useState(alt.bio ?? "");

  const handleSubmit = () => {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    startTransition(async () => {
      const result = await updateAltAction(alt.id, {
        displayName: displayName.trim(),
        inGameName: inGameName.trim() || null,
        bio: bio.trim() || undefined,
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`editDisplayName-${alt.id}`} className="text-xs">
            Display Name
          </Label>
          <Input
            id={`editDisplayName-${alt.id}`}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display Name"
          />
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
      </div>
      <div className="space-y-1">
        <Label htmlFor={`editBio-${alt.id}`} className="text-xs">
          Bio
        </Label>
        <Textarea
          id={`editBio-${alt.id}`}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="About this alt..."
          rows={2}
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

function AccountSettings() {
  const { user } = useAuth();
  const email = user?.email ?? "";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>Your account email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="text-muted-foreground h-5 w-5" />
            <span className="text-sm">{email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-muted-foreground text-xs">
                  Change your account password
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
