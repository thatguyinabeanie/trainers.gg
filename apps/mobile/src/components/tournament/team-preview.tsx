import React from "react";
import { YStack, XStack, Text } from "tamagui";

/**
 * TeamPreview component - displays a Pokemon team in a grid layout
 * Uses compact mode for inline/summary views, full mode for detail views
 */

interface TeamPokemon {
  species: string;
  nickname?: string | null;
  held_item?: string | null;
  ability?: string;
  tera_type?: string | null;
}

interface TeamPreviewProps {
  pokemon: TeamPokemon[];
  compact?: boolean;
}

export function TeamPreview({ pokemon, compact = false }: TeamPreviewProps) {
  if (pokemon.length === 0) return null;

  return (
    <XStack flexWrap="wrap" gap="$2">
      {pokemon.map((mon, i) => (
        <YStack
          key={i}
          backgroundColor="$backgroundStrong"
          padding={compact ? "$2" : "$3"}
          borderRadius="$3"
          width="48%"
          gap="$1"
        >
          {/* Species name */}
          <Text fontWeight="600" fontSize="$3">
            {mon.species}
          </Text>

          {/* Nickname (only shown if different from species) */}
          {mon.nickname && mon.nickname !== mon.species && (
            <Text fontSize="$2" color="$mutedForeground" fontStyle="italic">
              {`"${mon.nickname}"`}
            </Text>
          )}

          {/* Extended details shown in non-compact mode */}
          {!compact && (
            <>
              {mon.held_item && (
                <Text fontSize="$2" color="$mutedForeground">
                  {mon.held_item}
                </Text>
              )}
              {mon.ability && (
                <Text fontSize="$2" color="$mutedForeground">
                  {mon.ability}
                </Text>
              )}
              {mon.tera_type && (
                <Text fontSize="$2" color="$primary">
                  Tera: {mon.tera_type}
                </Text>
              )}
            </>
          )}
        </YStack>
      ))}
    </XStack>
  );
}
