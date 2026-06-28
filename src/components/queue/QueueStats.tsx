"use client";

import { useTranslations } from "next-intl";
import { Clock, Check, Users, Calendar } from "lucide-react";

interface QueueStatsProps {
  stats: {
    total: number;
    scheduled: number;
    waiting: number;
    completed: number;
  };
}

export function QueueStats({ stats }: QueueStatsProps) {
  const t = useTranslations("queue.stats");
  const items = [
    {
      label: t("total"),
      value: stats.total,
      icon: Users,
      color: "text-foreground",
      bg: "bg-muted",
    },
    {
      label: t("scheduled"),
      value: stats.scheduled,
      icon: Calendar,
      color: "text-slate-600",
      bg: "bg-slate-100 dark:bg-slate-900",
    },
    {
      label: t("waiting"),
      value: stats.waiting,
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: t("done"),
      value: stats.completed,
      icon: Check,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl ${item.bg} px-4 py-3 text-center`}
        >
          <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
            <item.icon className="h-3 w-3" />
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
