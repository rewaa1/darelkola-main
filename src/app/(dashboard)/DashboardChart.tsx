"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  count: {
    label: "Appointments",
    color: "hsl(221, 83%, 53%)",
  },
} satisfies ChartConfig;

interface DashboardChartProps {
  data: { date: string; count: number }[];
}

export function DashboardChart({ data }: DashboardChartProps) {
  // Format dates: short weekday labels (e.g., "Mon")
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "narrow",
    }),
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[180px] sm:h-[200px] w-full"
    >
      <AreaChart
        data={formatted}
        margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
      >
        <defs>
          <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-count)"
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor="var(--color-count)"
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={2}
          fontSize={11}
          allowDecimals={false}
          width={30}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Area
          dataKey="count"
          type="monotone"
          fill="url(#fillCount)"
          stroke="var(--color-count)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
