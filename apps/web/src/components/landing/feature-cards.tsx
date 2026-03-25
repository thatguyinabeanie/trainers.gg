import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy, Users, BarChart3 } from "lucide-react";
import Link from "next/link";
import { AnalyticsCardLink } from "./analytics-card-link";

export function FeatureCards() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-screen-xl px-4">
        <h2 className="mb-10 text-center text-2xl font-semibold">
          Everything you need to compete
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Tournaments */}
          <Card>
            <CardHeader>
              <div className="text-primary mb-2">
                <Trophy className="h-8 w-8" />
              </div>
              <CardTitle>Tournaments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Browse and register for tournaments. Track rounds, standings,
                and results in real time.
              </p>
            </CardContent>
            <CardFooter>
              <Link
                href="/tournaments"
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                View Tournaments
              </Link>
            </CardFooter>
          </Card>

          {/* Organizations */}
          <Card>
            <CardHeader>
              <div className="text-primary mb-2">
                <Users className="h-8 w-8" />
              </div>
              <CardTitle>Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Join communities that run events in your area or format. Request
                to join and stay connected.
              </p>
            </CardContent>
            <CardFooter>
              <Link
                href="/organizations"
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Find Organizations
              </Link>
            </CardFooter>
          </Card>

          {/* Analytics */}
          <Card>
            <CardHeader>
              <div className="text-primary mb-2">
                <BarChart3 className="h-8 w-8" />
              </div>
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                See your match history, win rates, and trends. Understand how
                you&apos;re improving over time.
              </p>
            </CardContent>
            <CardFooter>
              <AnalyticsCardLink />
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
