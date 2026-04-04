"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { updateFeaturedOrderAction, toggleFeaturedAction } from "../actions";

interface FeaturedCommunity {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  icon: string | null;
  featured_order: number | null;
}

function getCommunityInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface SortableItemProps {
  community: FeaturedCommunity;
  onRemove: (id: number) => void;
}

function SortableItem({ community, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: community.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-background flex items-center gap-3 rounded-lg border px-4 py-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Avatar className="h-10 w-10 rounded-[10px]">
        <AvatarImage
          src={community.logo_url ?? undefined}
          alt={community.name}
          className="rounded-[10px]"
        />
        <AvatarFallback className="bg-primary/10 text-primary rounded-[10px] text-sm font-semibold">
          {community.icon ? (
            <span>{community.icon}</span>
          ) : (
            getCommunityInitials(community.name)
          )}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{community.name}</div>
        <div className="text-muted-foreground text-xs">@{community.slug}</div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(community.id)}
        aria-label={`Remove ${community.name} from featured`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function FeaturedCommunitiesPage() {
  const [communities, setCommunities] = useState<FeaturedCommunity[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    async function fetchFeatured() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("communities")
        .select("id, name, slug, logo_url, icon, featured_order")
        .eq("is_featured", true)
        .order("featured_order", { ascending: true });

      if (!error && data) {
        setCommunities(data);
      }
      setLoading(false);
    }
    fetchFeatured();
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = communities.findIndex((c) => c.id === active.id);
    const newIndex = communities.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(communities, oldIndex, newIndex);
    setCommunities(reordered);

    const result = await updateFeaturedOrderAction(reordered.map((c) => c.id));
    if (!result.success) {
      toast.error(result.error ?? "Failed to save order");
    }
  }

  async function handleRemove(communityId: number) {
    const result = await toggleFeaturedAction(communityId, false);
    if (result.success) {
      setCommunities((prev) => prev.filter((c) => c.id !== communityId));
      toast.success("Removed from featured");
    } else {
      toast.error(result.error ?? "Failed to remove");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Star className="h-5 w-5" />
          Featured Communities
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Drag to reorder. These appear at the top of the communities page.
        </p>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-8 text-center text-sm">
          Loading...
        </div>
      ) : communities.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No featured communities yet. Feature a community from the
            communities list.
          </p>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={communities.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {communities.map((community) => (
                <SortableItem
                  key={community.id}
                  community={community}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
