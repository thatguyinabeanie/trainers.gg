import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { NAV_LINKS } from "@/components/nav-links";
import { TopNavAuthSection } from "@/components/topnav-auth-section";

export function TopNav() {
  return (
    <header className="border-border/40 bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Left: Logo */}
        <div className="flex items-center">
          <MobileNav />
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-primary text-xl font-bold">trainers.gg</span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Auth & Theme */}
        <div className="ml-auto flex items-center">
          <TopNavAuthSection />
        </div>
      </div>
    </header>
  );
}
