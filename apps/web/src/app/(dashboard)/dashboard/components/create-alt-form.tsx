"use client";

import { useState, useTransition } from "react";
import { Plus, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAltAction } from "@/actions/alts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreateAltFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// CreateAltForm
// ---------------------------------------------------------------------------

export function CreateAltForm({ onCreated, onCancel }: CreateAltFormProps) {
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState("");

  const handleSubmit = () => {
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }

    startTransition(async () => {
      const result = await createAltAction({
        username: username.trim().toLowerCase(),
      });

      if (result.success) {
        toast.success("Alt created successfully!");
        onCreated();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
              <Plus className="text-primary size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Create New Alt</h3>
              <p className="text-muted-foreground text-xs">
                Add a new player identity
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newAltUsername" className="text-sm font-medium">
            Username <span className="text-destructive">*</span>
          </Label>
          <Input
            id="newAltUsername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="font-mono"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onCancel();
            }}
            autoFocus
          />
          <p className="text-muted-foreground text-xs">
            Used for tournament registration
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            size="sm"
            className="gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="size-3.5" />
                Create Alt
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
