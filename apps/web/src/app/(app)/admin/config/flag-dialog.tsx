"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Json } from "@trainers/supabase/types";

// --- Types ---

interface FeatureFlag {
  id: number;
  key: string;
  description: string | null;
  enabled: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

interface FlagDialogProps {
  /** When provided, the dialog is in "edit" mode and pre-fills values. */
  flag?: FeatureFlag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    key: string;
    description?: string;
    enabled?: boolean;
    metadata?: Json;
  }) => Promise<void>;
}

// --- Helpers ---

/** Validate that a key is non-empty and snake_case. */
function isValidSnakeCase(value: string): boolean {
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(value);
}

/** Try to parse a JSON string; returns undefined if invalid or empty. */
function tryParseJson(value: string): Json | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as Json;
  } catch {
    return undefined;
  }
}

// --- Component ---

export function FlagDialog({
  flag,
  open,
  onOpenChange,
  onSubmit,
}: FlagDialogProps) {
  const isEdit = !!flag;

  // Form state
  const [key, setKey] = useState(flag?.key ?? "");
  const [description, setDescription] = useState(flag?.description ?? "");
  const [enabled, setEnabled] = useState(flag?.enabled ?? false);
  const [metadataStr, setMetadataStr] = useState(
    flag?.metadata ? JSON.stringify(flag.metadata, null, 2) : ""
  );
  const [submitting, setSubmitting] = useState(false);

  // Validation state
  const [keyError, setKeyError] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Reset form when dialog opens with new data
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      // Re-initialize when opening
      setKey(flag?.key ?? "");
      setDescription(flag?.description ?? "");
      setEnabled(flag?.enabled ?? false);
      setMetadataStr(
        flag?.metadata ? JSON.stringify(flag.metadata, null, 2) : ""
      );
      setKeyError(null);
      setMetadataError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    setMetadataError(null);

    // Validate key
    if (!key.trim()) {
      setKeyError("Key is required");
      return;
    }
    if (!isValidSnakeCase(key.trim())) {
      setKeyError("Key must be snake_case (e.g. my_feature_flag)");
      return;
    }

    // Validate metadata JSON (only if provided)
    let parsedMetadata: Json | undefined;
    if (metadataStr.trim()) {
      parsedMetadata = tryParseJson(metadataStr);
      if (parsedMetadata === undefined) {
        setMetadataError("Invalid JSON");
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        key: key.trim(),
        description: description.trim() || undefined,
        enabled,
        metadata: parsedMetadata,
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
            {isEdit ? "Edit Feature Flag" : "Create Feature Flag"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the feature flag settings below."
              : "Define a new feature flag to control platform behavior."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Key */}
          <div className="space-y-2">
            <Label htmlFor="flag-key">Key *</Label>
            <Input
              id="flag-key"
              placeholder="my_feature_flag"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setKeyError(null);
              }}
              disabled={isEdit}
              aria-invalid={!!keyError}
            />
            {keyError && <p className="text-destructive text-sm">{keyError}</p>}
            {!isEdit && (
              <p className="text-muted-foreground text-xs">
                Must be snake_case (lowercase letters, numbers, underscores)
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="flag-description">Description</Label>
            <Textarea
              id="flag-description"
              placeholder="What does this flag control?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="flag-enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(!!checked)}
            />
            <Label htmlFor="flag-enabled">Enabled</Label>
          </div>

          {/* Metadata JSON */}
          <div className="space-y-2">
            <Label htmlFor="flag-metadata">Metadata (JSON)</Label>
            <Textarea
              id="flag-metadata"
              placeholder='{"key": "value"}'
              value={metadataStr}
              onChange={(e) => {
                setMetadataStr(e.target.value);
                setMetadataError(null);
              }}
              rows={3}
              className="font-mono text-xs"
              aria-invalid={!!metadataError}
            />
            {metadataError && (
              <p className="text-destructive text-sm">{metadataError}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Flag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
