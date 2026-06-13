"use client";

/**
 * DonutBreakdownCard — client island for the admin dashboard.
 *
 * WHY this is a separate "use client" file: `recharts` is a client-only library.
 * Its module graph defines React class components that, when evaluated in the
 * RSC/server bundle, resolve a superclass to `undefined` and throw
 * `TypeError: Super expression must either be null or a function` at module
 * evaluation time. Importing `recharts` (Pie, PieChart, Label) or the
 * recharts-backed `@/components/ui/chart` primitives directly into the admin
 * `page.tsx` server component broke `next build` ("Failed to collect page data
 * for /admin"). Isolating the chart here keeps the server page free of any
 * recharts import.
 */

import { Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { CHART_COLORS, DEFAULT_FILL, humanLabel, buildChartData } from "./helpers";

// ── Donut Breakdown Chart ───────────────────────────────────────────

interface DonutBreakdownCardProps {
  title: string;
  data: Record<string, number> | undefined;
  labels: Record<string, string>;
}

export function DonutBreakdownCard({
  title,
  data,
  labels,
}: DonutBreakdownCardProps) {
  const { chartData, chartConfig, total } = buildChartData(data, labels);

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="flex flex-col items-center">
            {/* Donut chart */}
            <ChartContainer config={chartConfig} className="aspect-square h-36">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <div className="flex items-center gap-2">
                          <div
                            className="size-2.5 shrink-0 rounded-[2px]"
                            style={{
                              backgroundColor:
                                CHART_COLORS[name as string] ?? DEFAULT_FILL,
                            }}
                          />
                          <span className="text-muted-foreground">
                            {humanLabel(name as string, labels)}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {(value as number).toLocaleString()}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={60}
                  strokeWidth={2}
                  stroke="var(--color-card)"
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-2xl font-semibold"
                            >
                              {total.toLocaleString()}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-muted-foreground text-xs">
                    {humanLabel(item.name, labels)}
                  </span>
                  <span className="text-xs font-medium tabular-nums">
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No data
          </p>
        )}
      </CardContent>
    </Card>
  );
}
