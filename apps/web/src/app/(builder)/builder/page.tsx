import { type Metadata } from "next";

import { CopyrightYear } from "@/components/layout/copyright-year";
import { LandingShell } from "@/components/team-builder/landing/landing-shell";

export const metadata: Metadata = {
  title: "Team Builder — trainers.gg",
  description:
    "Build competitive Pokémon teams with type coverage checks, speed tiers, and damage calculations — no account required.",
};

/**
 * The footer is authored here in the Server Component so that CopyrightYear
 * (a Client Component) can be imported without violating the RSC → client
 * import boundary. The rendered ReactNode is passed into LandingShell as a prop
 * — Next.js allows passing a server-rendered node as children/prop to a Client
 * Component.
 */
const siteFooter = (
  <footer className="border-border/40 w-full border-t py-6">
    <div className="text-muted-foreground container mx-auto flex flex-col items-center justify-between px-4 text-sm md:flex-row md:px-6">
      <p className="font-semibold whitespace-nowrap">
        Built for competitors, by competitors.
      </p>
      <p className="text-xs whitespace-nowrap">
        &copy; <CopyrightYear /> Beanie LLC
      </p>
    </div>
  </footer>
);

export default function BuilderPage() {
  return <LandingShell footer={siteFooter} />;
}
