"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBlueskyUser } from "@/hooks/bluesky/use-bluesky-user";
import { FeedContainer } from "@/components/bluesky/feed";
import { usePokemonFeed, flattenFeedPages } from "@/hooks/bluesky";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppBskyFeedDefs } from "@atproto/api";
import {
  ComposeDialog,
  createReplyContext,
  type ReplyContext,
} from "@/components/bluesky/compose";
import { PenSquare } from "lucide-react";
import { LoginScreen } from "@/components/auth/login-screen";
import { WaitlistForm } from "@/components/auth/waitlist-form";
import { PageContainer } from "@/components/layout/page-container";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { blueskyDid, isLoading: blueskyLoading } = useBlueskyUser();
  const [selectedTab, setSelectedTab] = useState<"pokemon" | "all">("pokemon");
  // Compose dialog state
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyContext, setReplyContext] = useState<ReplyContext | undefined>();

  const isLoading = authLoading || blueskyLoading;

  // Check if maintenance mode is active
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  // Fetch Pokemon feed (default)
  const pokemonFeed = usePokemonFeed(blueskyDid);

  // Flatten the pages into a single array
  const posts = flattenFeedPages(pokemonFeed.data?.pages);

  // Handler for reply button
  const handleReply = (post: AppBskyFeedDefs.PostView) => {
    setReplyContext(createReplyContext(post));
    setComposeOpen(true);
  };

  // Handler for new post button
  const handleNewPost = () => {
    setReplyContext(undefined);
    setComposeOpen(true);
  };

  // Handler for successful post
  const handlePostSuccess = () => {
    // Refetch the feed to show the new post
    pokemonFeed.refetch();
  };

  // Not signed in state - show waitlist in maintenance mode, otherwise login screen
  if (!isLoading && !user) {
    if (maintenanceMode) {
      return (
        <PageContainer className="flex min-h-[80vh] flex-col items-center justify-center">
          <WaitlistForm />
        </PageContainer>
      );
    }
    return <LoginScreen />;
  }

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen">
        <div className="border-border mx-auto min-h-screen max-w-2xl border-x">
          <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 backdrop-blur">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="bg-muted h-6 w-16 animate-pulse rounded" />
              <div className="bg-muted h-8 w-24 animate-pulse rounded" />
            </div>
          </header>
        </div>
      </main>
    );
  }

  // Signed in but no Bluesky connection
  if (user && !blueskyDid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold">Connect to Bluesky</h1>
          <p className="text-muted-foreground mb-6">
            Link your Bluesky account to see and interact with posts from the
            Pokemon community.
          </p>
          <Button onClick={() => (window.location.href = "/auth/link-bluesky")}>
            Connect Bluesky
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Two-column layout like Twitter/Bluesky */}
      <div className="border-border mx-auto min-h-screen max-w-2xl border-x">
        {/* Header */}
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4">
            <h1 className="text-xl font-bold">Home</h1>
            <Button onClick={handleNewPost} size="sm" className="gap-2">
              <PenSquare className="size-4" />
              <span className="hidden sm:inline">New Post</span>
            </Button>
          </div>

          {/* Tab switcher */}
          <Tabs
            value={selectedTab}
            onValueChange={(v) => setSelectedTab(v as "pokemon" | "all")}
          >
            <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-none bg-transparent p-0">
              <TabsTrigger
                value="pokemon"
                className="data-[state=active]:border-primary hover:bg-muted/50 flex-1 rounded-none border-b-2 border-transparent px-4 py-3 font-semibold transition-colors data-[state=active]:bg-transparent"
              >
                Pokemon
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="data-[state=active]:border-primary hover:bg-muted/50 flex-1 rounded-none border-b-2 border-transparent px-4 py-3 font-semibold transition-colors data-[state=active]:bg-transparent"
                disabled
              >
                All (Coming Soon)
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Bottom border for header */}
          <div className="border-border border-b" />
        </header>

        {/* Feed content */}
        <FeedContainer
          posts={posts}
          isLoading={pokemonFeed.isLoading || isLoading}
          isFetchingNextPage={pokemonFeed.isFetchingNextPage}
          error={pokemonFeed.error}
          hasNextPage={pokemonFeed.hasNextPage}
          fetchNextPage={pokemonFeed.fetchNextPage}
          onReply={handleReply}
          emptyMessage="No Pokemon posts found. Follow more trainers to see their posts here!"
        />
      </div>

      {/* Compose Dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        replyTo={replyContext}
        onSuccess={handlePostSuccess}
      />
    </main>
  );
}
