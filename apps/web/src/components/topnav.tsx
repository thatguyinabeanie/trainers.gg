import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { TopNavAuthSection } from "@/components/topnav-auth-section";

export function TopNav() {
  return (
    <header className="border-border/40 bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center px-4 md:px-6">
        {/* Left: Logo */}
        <div className="flex items-center">
          <MobileNav />
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-primary text-xl font-bold">trainers.gg</span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
          <Link
            href="/tournaments"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Tournaments
          </Link>
          <Link
            href="/organizations"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Organizations
          </Link>
          <Link
            href="/players"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Players
          </Link>
          <Link
            href="/teams"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Builder
          </Link>
          <Link
            href="/articles"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Articles
          </Link>
        </nav>

        {/* Right: Auth & Theme */}
        <div className="ml-auto flex items-center">
          <TopNavAuthSection />
        </div>
      </div>
    </header>
  );
}
