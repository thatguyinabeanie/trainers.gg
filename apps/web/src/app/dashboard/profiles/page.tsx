"use client";

import { useSupabaseQuery, useSupabase } from "@/lib/supabase";
import { getCurrentUserAlts } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Swords } from "lucide-react";

export default function ProfilesPage() {
  const altsQueryFn = (client: TypedSupabaseClient) =>
    getCurrentUserAlts(client);

  const { data: alts, isLoading } = useSupabaseQuery(altsQueryFn, ["alts"]);

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
        <h2 className="text-2xl font-bold">My Profiles</h2>
        <p className="text-muted-foreground text-sm">
          Your player identities used for tournament registration
        </p>
      </div>

      {!alts || alts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Swords className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
            <h3 className="mb-2 text-lg font-semibold">No profiles found</h3>
            <p className="text-muted-foreground text-sm">
              Your profile should have been created automatically when you
              signed up.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {alts.map((alt) => (
            <Card key={alt.id}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    {alt.avatar_url && (
                      <AvatarImage
                        src={alt.avatar_url}
                        alt={alt.display_name ?? alt.username}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(alt.display_name ?? alt.username)
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {alt.display_name ?? alt.username}
                      <Badge variant="outline" className="text-xs">
                        Main
                      </Badge>
                    </CardTitle>
                    <CardDescription>@{alt.username}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {alt.bio && (
                    <p className="text-muted-foreground">{alt.bio}</p>
                  )}
                  {alt.battle_tag && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Battle Tag:</span>
                      <span className="font-medium">{alt.battle_tag}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
