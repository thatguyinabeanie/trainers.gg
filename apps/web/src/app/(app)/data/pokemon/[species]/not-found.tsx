import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Not-found page for /data/pokemon/[species].
 *
 * Rendered when the route's slug does not resolve to a known species via
 * Dex.species.get(). A valid species with no data in a format shows the
 * empty-state inside SpeciesDrilldown, not this page.
 */
export default function SpeciesNotFound() {
  return (
    <PageContainer>
      <EmptyState
        icon={SearchX}
        title="Pokémon not found"
        description="The Pokémon you're looking for doesn't exist. Check the URL and try again, or browse the full Meta Explorer."
        action={
          <Link href="/data">
            <Button variant="outline">Back to Meta Explorer</Button>
          </Link>
        }
      />
    </PageContainer>
  );
}
