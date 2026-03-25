import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Swords, GraduationCap } from "lucide-react";

const comingSoon = [
  {
    icon: Swords,
    title: "Team Builder",
    description: "Build, share, and analyze your Pokemon teams.",
  },
  {
    icon: GraduationCap,
    title: "Coaching",
    description: "Get guidance from experienced competitive players.",
  },
] as const;

export function ComingSoonCards() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-screen-xl px-4">
        <h2 className="mb-10 text-center text-2xl font-semibold">
          More on the way
        </h2>
        <div className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2">
          {comingSoon.map((item) => (
            <Card key={item.title} className="opacity-75">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground mb-2">
                    <item.icon className="h-8 w-8" />
                  </div>
                  <StatusBadge status="draft" label="Coming Soon" />
                </div>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
