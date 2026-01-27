"use client";

import { useState, useEffect } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    }
  }, [open]);

  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const result = await inviteStaffMember(
        organizationId,
        selectedUser.id,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = selectedUser && !isSubmitting;

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

        <div className="space-y-4 py-4">
          {/* User Selection */}
          {selectedUser ? (
            <div className="space-y-2">
              <Label>Selected User</Label>
              <div className="bg-muted flex items-center justify-between rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Avatar size="sm">
                    {selectedUser.image && (
                      <AvatarImage
                        src={selectedUser.image}
                        alt={getDisplayName(selectedUser)}
                      />
                    )}
                    <AvatarFallback>{getInitials(selectedUser)}</AvatarFallback>
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
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
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
                      <Avatar size="sm">
                        {user.image && (
                          <AvatarImage
                            src={user.image}
                            alt={getDisplayName(user)}
                          />
                        )}
                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{getDisplayName(user)}</p>
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
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
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
      </DialogContent>
    </Dialog>
  );
}
