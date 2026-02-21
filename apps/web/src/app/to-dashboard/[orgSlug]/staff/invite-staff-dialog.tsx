"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@trainers/validators";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, UserPlus } from "lucide-react";
import { searchUsersForStaffInvite, inviteStaffMember } from "@/actions/staff";

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  orgSlug: string;
  onSuccess: () => void;
}

interface SearchResult {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
}

function getDisplayName(user: SearchResult): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user.first_name) {
    return user.first_name;
  }
  return user.username ?? "Unknown";
}

function getInitials(user: SearchResult): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  }
  if (user.first_name) {
    return user.first_name.slice(0, 2).toUpperCase();
  }
  if (user.username) {
    return user.username.slice(0, 2).toUpperCase();
  }
  return "??";
}

const inviteStaffSchema = z.object({
  userId: z.string().min(1, "Please select a user"),
});

type InviteStaffFormData = z.infer<typeof inviteStaffSchema>;

export function InviteStaffDialog({
  open,
  onOpenChange,
  organizationId,
  orgSlug,
  onSuccess,
}: InviteStaffDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);

  const form = useForm<InviteStaffFormData>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: {
      userId: "",
    },
  });

  const { isSubmitting } = form.formState;

  // Debounced search with cancellation
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchUsersForStaffInvite(
        organizationId,
        searchTerm
      );
      if (cancelled) return;
      if (result.success) {
        setSearchResults(result.data);
      } else {
        toast.error(result.error);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, organizationId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSearchResults([]);
      setSelectedUser(null);
      form.reset({ userId: "" });
    }
  }, [open, form]);

  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user);
    form.setValue("userId", user.id);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    form.setValue("userId", "");
  };

  const onSubmit = async (data: InviteStaffFormData) => {
    if (!selectedUser) return;

    try {
      const result = await inviteStaffMember(
        organizationId,
        data.userId,
        orgSlug
      );

      if (result.success) {
        toast.success(`${getDisplayName(selectedUser)} added to staff`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>
            Search for a user to add to your organization. You can assign them
            to a group after they&apos;re added.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="py-4">
              {/* User Selection */}
              <FormField
                control={form.control}
                name="userId"
                render={() => (
                  <FormItem>
                    {selectedUser ? (
                      <div className="space-y-2">
                        <FormLabel>Selected User</FormLabel>
                        <div className="bg-muted flex items-center justify-between rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {selectedUser.image && (
                                <AvatarImage
                                  src={selectedUser.image}
                                  alt={getDisplayName(selectedUser)}
                                />
                              )}
                              <AvatarFallback>
                                {getInitials(selectedUser)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {getDisplayName(selectedUser)}
                              </p>
                              {selectedUser.username && (
                                <p className="text-muted-foreground text-sm">
                                  @{selectedUser.username}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearSelection}
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="search">Search Users</Label>
                        <div className="relative">
                          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                          <Input
                            id="search"
                            placeholder="Search by username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                          {isSearching && (
                            <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
                          )}
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                          <div className="bg-muted/50 max-h-48 overflow-y-auto rounded-lg border">
                            {searchResults.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                className="hover:bg-muted flex w-full items-center gap-3 p-3 text-left transition-colors"
                                onClick={() => handleSelectUser(user)}
                              >
                                <Avatar className="h-8 w-8">
                                  {user.image && (
                                    <AvatarImage
                                      src={user.image}
                                      alt={getDisplayName(user)}
                                    />
                                  )}
                                  <AvatarFallback>
                                    {getInitials(user)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {getDisplayName(user)}
                                  </p>
                                  {user.username && (
                                    <p className="text-muted-foreground text-sm">
                                      @{user.username}
                                    </p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {searchTerm.length >= 2 &&
                          !isSearching &&
                          searchResults.length === 0 && (
                            <p className="text-muted-foreground py-4 text-center text-sm">
                              No users found matching &quot;{searchTerm}&quot;
                            </p>
                          )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={!selectedUser || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Add Staff
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
