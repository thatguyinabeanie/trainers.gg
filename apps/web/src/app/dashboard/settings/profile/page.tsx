"use client";

import { useState, useTransition } from "react";
import { useAuth, getUserDisplayName } from "@/components/auth/auth-provider";
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
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateProfileAction } from "@/actions/alts";

export default function ProfileSettingsPage() {
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
