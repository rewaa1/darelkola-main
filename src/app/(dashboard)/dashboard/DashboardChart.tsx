"use client";

import { useLocale, useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { getDirection, type Locale } from "@/i18n/config";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface DashboardChartProps {
  data: { date: string; count: number }[];
}

export function DashboardChart({ data }: DashboardChartProps) {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const isRtl = getDirection(locale) === "rtl";

  const chartConfig = {
    count: {
      label: t("appointments"),
      color: "hsl(221, 83%, 53%)",
    },
  } satisfies ChartConfig;

  // Narrow weekday initials, in the active locale (e.g. "M" / "ن").
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString(locale, {
      weekday: "narrow",
    }),
  }));

  return (
    <ChartContainer
      id="dashboard-appointments"
      config={chartConfig}
      className="aspect-auto h-[180px] sm:h-[200px] w-full"
    >
      <AreaChart
        data={formatted}
        margin={
          isRtl
            ? { top: 5, right: -25, left: 5, bottom: 0 }
            : { top: 5, right: 5, left: -25, bottom: 0 }
        }
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
        {/* In RTL the timeline runs right-to-left, so the oldest day sits on
            the right and the value axis moves to the right edge. */}
        <XAxis
          dataKey="label"
          reversed={isRtl}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={11}
        />
        <YAxis
          orientation={isRtl ? "right" : "left"}
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
