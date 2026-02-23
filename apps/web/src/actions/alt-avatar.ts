"use server";

import { z } from "@trainers/validators";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { withAction } from "./utils";

const SHOWDOWN_SPRITE_PREFIX = "https://play.pokemonshowdown.com/sprites/";

const altIdSchema = z.number().int().positive("Invalid alt ID");

const spriteUrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith(SHOWDOWN_SPRITE_PREFIX), {
    message: "Avatar must be a Pokemon Showdown sprite URL",
  });

/**
 * Set a Pokemon sprite as the alt's avatar.
 * Validates the URL is a Showdown sprite and that the user owns the alt.
 */
export async function setAltAvatar(altId: number, spriteUrl: string) {
  return withAction(async () => {
    altIdSchema.parse(altId);
    spriteUrlSchema.parse(spriteUrl);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Verify user owns this alt
    const { data: alt } = await supabase
      .from("alts")
      .select("user_id")
      .eq("id", altId)
      .single();

    if (!alt) throw new Error("Alt not found");
    if (alt.user_id !== user.id) {
      throw new Error("You can only update your own alt");
    }

    const { error } = await supabase
      .from("alts")
      .update({ avatar_url: spriteUrl })
      .eq("id", altId);

    if (error) throw error;

    revalidatePath("/");
    return { avatarUrl: spriteUrl };
  }, "Failed to set avatar");
}

/**
 * Remove the alt's avatar (set to null).
 */
export async function removeAltAvatar(altId: number) {
  return withAction(async () => {
    altIdSchema.parse(altId);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Verify user owns this alt
    const { data: alt } = await supabase
      .from("alts")
      .select("user_id")
      .eq("id", altId)
      .single();

    if (!alt) throw new Error("Alt not found");
    if (alt.user_id !== user.id) {
      throw new Error("You can only update your own alt");
    }

    const { error } = await supabase
      .from("alts")
      .update({ avatar_url: null })
      .eq("id", altId);

    if (error) throw error;

    revalidatePath("/");
  }, "Failed to remove avatar");
}
