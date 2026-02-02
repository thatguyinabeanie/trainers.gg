"use client";

import { useState, useTransition } from "react";
import { useAuth, getUserDisplayName } from "@/components/auth/auth-provider";
import { useSupabaseQuery, useSupabase } from "@/lib/supabase";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Swords, Loader2, Save, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="container mx-auto max-w-screen-lg px-4 py-8 md:px-6">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container mx-auto max-w-screen-lg px-4 py-8 md:px-6">
        <h1 className="mb-6 text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Please sign in to access your settings.
        </p>
      </main>
    );
  }

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
  const supabase = useSupabase();
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
      const { error } = await supabase
        .from("alts")
        .update({
          display_name: name,
          bio: bio || null,
        })
        .eq("id", user.profile!.id);

      if (error) {
        toast.error("Failed to update profile");
      } else {
        toast.success("Profile updated");
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
  const altsQueryFn = (client: TypedSupabaseClient) =>
    getCurrentUserAlts(client);

  const { data: alts, isLoading } = useSupabaseQuery(altsQueryFn, ["alts"]);

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
          <CardTitle>Your Alts</CardTitle>
          <CardDescription>
            Manage your player identities. Alts are used for tournament
            registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!alts || alts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No alts found. Your alt should have been created automatically.
            </p>
          ) : (
            <div className="space-y-3">
              {alts.map((alt) => (
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
                        <Badge variant="outline" className="text-xs">
                          Main
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        @{alt.username}
                      </p>
                      {alt.battle_tag && (
                        <p className="text-muted-foreground text-xs">
                          Battle Tag: {alt.battle_tag}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
