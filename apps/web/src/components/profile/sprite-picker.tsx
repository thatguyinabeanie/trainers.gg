"use client";

import { useRef, useState, useTransition } from "react";
import { getAllSpeciesNames } from "@trainers/pokemon";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  getPokemonSprite,
  FEATURED_TRAINERS,
  getTrainerSpriteUrl,
} from "@trainers/pokemon/sprites";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { setAltAvatar, removeAltAvatar } from "@/actions/alt-avatar";
import { cn } from "@/lib/utils";

// Load species list once at module level (pure function, no network call)
const allSpecies = getAllSpeciesNames();

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const COLUMNS = 6;
const ROW_HEIGHT = 44; // 40px sprite + 4px padding
const ROW_GAP = 4; // gap-1

interface SpritePickerProps {
  altId: number;
  currentAvatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
}

export function SpritePicker({
  altId,
  currentAvatarUrl,
  onAvatarChange,
}: SpritePickerProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pokemon");

  // Filter Pokemon by search or show all species
  const filteredPokemon = search
    ? allSpecies.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : allSpecies;

  // Filter trainers by search or show all
  const filteredTrainers = search
    ? FEATURED_TRAINERS.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
      )
    : FEATURED_TRAINERS;

  const scrollRef = useRef<HTMLDivElement>(null);
  const pokemonRows = chunkArray(filteredPokemon, COLUMNS);
  const rowVirtualizer = useVirtualizer({
    count: pokemonRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    gap: ROW_GAP,
    overscan: 3,
  });

  function handleSelectSprite(url: string) {
    startTransition(async () => {
      const result = await setAltAvatar(altId, url);
      if (result.success) {
        onAvatarChange(url);
        toast.success("Avatar updated");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAltAvatar(altId);
      if (result.success) {
        onAvatarChange(null);
        toast.success("Avatar removed");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex w-72 flex-col gap-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            scrollRef.current?.scrollTo({ top: 0 });
          }}
          placeholder={
            tab === "pokemon" ? "Search Pokemon..." : "Search trainers..."
          }
          className="h-8 pr-7 pl-7 text-sm"
          disabled={isPending}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setSearch("");
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="pokemon">Pokemon</TabsTrigger>
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
        </TabsList>

        {/* Pokemon Grid (virtualized) */}
        <TabsContent value="pokemon">
          <div
            ref={scrollRef}
            className="no-scrollbar max-h-60 overflow-y-auto"
          >
            <div
              className="relative w-full"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = pokemonRows[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
                    className="absolute left-0 grid w-full grid-cols-6 gap-1"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row?.map((name) => {
                      const sprite = getPokemonSprite(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          title={name}
                          onClick={() => handleSelectSprite(sprite.url)}
                          disabled={isPending}
                          className={cn(
                            "hover:bg-muted flex items-center justify-center rounded-md p-0.5 transition-colors disabled:opacity-50",
                            currentAvatarUrl === sprite.url &&
                              "ring-primary bg-primary/10 ring-2"
                          )}
                        >
                          <img
                            src={sprite.url}
                            alt={name}
                            width={40}
                            height={40}
                            className="image-pixelated size-10"
                            loading="lazy"
                          />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {filteredPokemon.length === 0 && (
              <p className="text-muted-foreground col-span-6 py-8 text-center text-sm">
                No Pokemon found
              </p>
            )}
          </div>
        </TabsContent>

        {/* Trainer Grid */}
        <TabsContent value="trainers">
          <div className="no-scrollbar grid max-h-60 grid-cols-4 gap-1 overflow-y-auto">
            {filteredTrainers.map((trainer) => {
              const url = getTrainerSpriteUrl(trainer.filename);
              return (
                <button
                  key={trainer.filename}
                  type="button"
                  title={trainer.name}
                  onClick={() => handleSelectSprite(url)}
                  disabled={isPending}
                  className={cn(
                    "hover:bg-muted flex flex-col items-center justify-end rounded-md p-1 transition-colors disabled:opacity-50",
                    currentAvatarUrl === url &&
                      "ring-primary bg-primary/10 ring-2"
                  )}
                >
                  <img
                    src={url}
                    alt={trainer.name}
                    className="h-12 w-auto object-contain"
                    loading="lazy"
                  />
                  <span className="text-muted-foreground mt-0.5 max-w-full truncate text-[10px] leading-tight">
                    {trainer.name}
                  </span>
                </button>
              );
            })}
            {filteredTrainers.length === 0 && (
              <p className="text-muted-foreground col-span-4 py-8 text-center text-sm">
                No trainers found
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer — remove button + loading spinner */}
      <div className="flex items-center justify-between">
        {currentAvatarUrl ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground text-xs underline disabled:opacity-50"
          >
            Remove avatar
          </button>
        ) : (
          <span />
        )}
        {isPending && (
          <Loader2 className="text-muted-foreground size-3 animate-spin" />
        )}
      </div>
    </div>
  );
}
