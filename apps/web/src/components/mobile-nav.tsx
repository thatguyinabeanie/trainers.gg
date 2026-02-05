"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Trophy,
  Home,
  Building2,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const authenticatedNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/coaching", label: "Coaching", icon: GraduationCap },
];

const publicNavItems: NavItem[] = [
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/coaching", label: "Coaching", icon: GraduationCap },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleNavClick = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const navItems = user ? authenticatedNavItems : publicNavItems;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle>trainers.gg</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavClick(item.href)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {!user && (
          <div className="mt-auto space-y-2 pt-6">
            <Button
              className="w-full"
              onClick={() => handleNavClick("/sign-in")}
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleNavClick("/sign-up")}
            >
              Sign Up
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
