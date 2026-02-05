import { createClient } from "@/lib/supabase/server";
import { getUserSpritePreference } from "@trainers/supabase";
import { DisplayPreferencesForm } from "@/components/settings/display-preferences-form";

export default async function DisplaySettingsPage() {
  const supabase = await createClient();

  // Fetch current sprite preference from database
  const spritePreference = await getUserSpritePreference(supabase);

  return <DisplayPreferencesForm initialPreference={spritePreference} />;
}
