"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { appointmentStatuses } from "./appointment-types";

interface AppointmentFiltersProps {
  clinics: { id: string; name: string }[];
  clinicFilter: string;
  onClinicFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
}

export function AppointmentFilters({
  clinics,
  clinicFilter,
  onClinicFilterChange,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  searchQuery,
  onSearchChange,
  isLoading,
}: AppointmentFiltersProps) {
  const t = useTranslations("appointments.filters");
  const tStatus = useTranslations("status");

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("date")}
            </label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("clinic")}
            </label>
            <Select value={clinicFilter} onValueChange={onClinicFilterChange}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allClinics")}</SelectItem>
                {clinics.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("status")}
            </label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                {appointmentStatuses.map((value) => (
                  <SelectItem key={value} value={value}>
                    {tStatus(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">
              {t("search")}
            </label>
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="ps-8"
              />
            </div>
          </div>
          {isLoading && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
