"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- Types ---

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

type AnnouncementType = "info" | "warning" | "error" | "success";

interface AnnouncementDialogProps {
  /** When provided, the dialog is in "edit" mode and pre-fills values. */
  announcement?: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    message: string;
    type: AnnouncementType;
    start_at?: string;
    end_at?: string | null;
    is_active?: boolean;
  }) => Promise<void>;
}

// --- Helpers ---

/** Convert an ISO string to a datetime-local input value (YYYY-MM-DDTHH:MM). */
function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  // Adjust for local timezone offset
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

/** Convert a datetime-local input value to an ISO string. */
function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

const ANNOUNCEMENT_TYPES: { value: AnnouncementType; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "success", label: "Success" },
];

// --- Component ---

export function AnnouncementDialog({
  announcement,
  open,
  onOpenChange,
  onSubmit,
}: AnnouncementDialogProps) {
  const isEdit = !!announcement;

  // Form state
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [message, setMessage] = useState(announcement?.message ?? "");
  const [type, setType] = useState<AnnouncementType>(
    (announcement?.type as AnnouncementType) ?? "info"
  );
  const [startAt, setStartAt] = useState(
    announcement?.start_at ? toDatetimeLocal(announcement.start_at) : ""
  );
  const [endAt, setEndAt] = useState(
    announcement?.end_at ? toDatetimeLocal(announcement.end_at) : ""
  );
  const [isActive, setIsActive] = useState(announcement?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);

  // Validation state
  const [titleError, setTitleError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  // Reset form when dialog opens with new data
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTitle(announcement?.title ?? "");
      setMessage(announcement?.message ?? "");
      setType((announcement?.type as AnnouncementType) ?? "info");
      setStartAt(
        announcement?.start_at ? toDatetimeLocal(announcement.start_at) : ""
      );
      setEndAt(
        announcement?.end_at ? toDatetimeLocal(announcement.end_at) : ""
      );
      setIsActive(announcement?.is_active ?? true);
      setTitleError(null);
      setMessageError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError(null);
    setMessageError(null);

    // Validate required fields
    if (!title.trim()) {
      setTitleError("Title is required");
      return;
    }
    if (!message.trim()) {
      setMessageError("Message is required");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        message: message.trim(),
        type,
        start_at: startAt ? fromDatetimeLocal(startAt) : undefined,
        end_at: endAt ? fromDatetimeLocal(endAt) : null,
        is_active: isActive,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Announcement" : "Create Announcement"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the announcement details below."
              : "Create a new announcement to display to users."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="ann-title">Title *</Label>
            <Input
              id="ann-title"
              placeholder="Announcement title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(null);
              }}
              aria-invalid={!!titleError}
            />
            {titleError && (
              <p className="text-destructive text-sm">{titleError}</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="ann-message">Message *</Label>
            <Textarea
              id="ann-message"
              placeholder="Announcement message content"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setMessageError(null);
              }}
              rows={3}
              aria-invalid={!!messageError}
            />
            {messageError && (
              <p className="text-destructive text-sm">{messageError}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as AnnouncementType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANNOUNCEMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="ann-start">Start Date</Label>
            <Input
              id="ann-start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              When the announcement becomes visible. Defaults to now if left
              empty.
            </p>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="ann-end">End Date</Label>
            <Input
              id="ann-end"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              When the announcement expires. Leave empty for no expiration.
            </p>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="ann-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(!!checked)}
            />
            <Label htmlFor="ann-active">Active</Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
