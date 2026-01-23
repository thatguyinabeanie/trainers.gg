"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseQuery } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UsersPage() {
  const { data: users, isLoading } = useSupabaseQuery(async (supabase) => {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        username,
        first_name,
        last_name,
        image,
        created_at,
        last_sign_in_at,
        alts!alts_user_id_fkey(id, username, display_name, avatar_url),
        user_roles(
          role:roles(id, name, scope)
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Users</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Alt</TableHead>
              <TableHead>Site Roles</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => {
              // Handle the alts relationship - could be array or single
              const alt = Array.isArray(user.alts) ? user.alts[0] : user.alts;
              const siteRoles = user.user_roles
                ?.filter(
                  (ur) =>
                    ur.role &&
                    typeof ur.role === "object" &&
                    "scope" in ur.role &&
                    ur.role.scope === "site"
                )
                .map((ur) =>
                  ur.role && typeof ur.role === "object" && "name" in ur.role
                    ? ur.role.name
                    : ""
                )
                .filter(Boolean);

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback>
                          {user.username?.charAt(0).toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    {alt ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={alt.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {alt.username?.charAt(0).toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {alt.display_name ?? alt.username}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {siteRoles && siteRoles.length > 0 ? (
                        siteRoles.map((role) => (
                          <Badge key={role} variant="secondary">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {users?.length === 0 && (
          <div className="text-muted-foreground py-8 text-center">
            No users found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
