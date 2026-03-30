"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPES,
  type NotificationPreferences,
} from "@trainers/validators";
import { updateNotificationPreferencesAction } from "@/actions/notification-preferences";

interface NotificationPreferencesFormProps {
  initialPreferences: Record<string, boolean> | null;
  isStaff: boolean;
}

/**
 * Build a full preferences map from partial saved preferences.
 * Missing keys default to true (all enabled).
 */
function buildFullPreferences(
  saved: Record<string, boolean> | null
): NotificationPreferences {
  const result: Record<string, boolean> = {};
  for (const type of NOTIFICATION_TYPES) {
    result[type] = saved?.[type] ?? true;
  }
  return result as NotificationPreferences;
}

export function NotificationPreferencesForm({
  initialPreferences,
  isStaff,
}: NotificationPreferencesFormProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    buildFullPreferences(initialPreferences)
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: string, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateNotificationPreferencesAction(preferences);
      if (result.success) {
        toast.success("Notification preferences saved");
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Filter categories based on staff status
  const visibleCategories = NOTIFICATION_CATEGORIES.filter(
    (cat) => !cat.staffOnly || isStaff
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Notification Preferences</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose which notifications you want to receive. Disabled notifications
          will not be created.
        </p>
      </div>

      {visibleCategories.map((category) => (
        <div key={category.key} className="space-y-4">
          <div>
            <h3 className="text-base font-medium">{category.label}</h3>
            <p className="text-muted-foreground text-sm">
              {category.description}
            </p>
          </div>
          <div className="bg-card divide-y rounded-lg border">
            {category.types.map((type) => {
              const isEnabled = preferences[type.key] ?? true;

              return (
                <div
                  key={type.key}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={`pref-${type.key}`}
                      className="text-sm font-medium"
                    >
                      {type.label}
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      {type.description}
                    </p>
                  </div>
                  <Switch
                    id={`pref-${type.key}`}
                    aria-label={type.label}
                    checked={isEnabled}
                    onCheckedChange={(checked: boolean) =>
                      handleToggle(type.key, checked)
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
