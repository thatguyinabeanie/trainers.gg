import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, ArrowLeft } from "lucide-react";

export default function TournamentNotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Tournament not found</h3>
          <p className="text-muted-foreground mb-4 text-center">
            This tournament doesn&apos;t exist or has been removed
          </p>
          <Link href="/tournaments">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournaments
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
