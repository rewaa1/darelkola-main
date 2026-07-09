"use client";

import { useTranslations, useFormatter } from "next-intl";
import { labCategories } from "@/lib/lab-fields";
import { ViewableSheet } from "./types";

export function InvestigationSheetView({
  sheet,
  showDate = true,
}: {
  sheet: ViewableSheet;
  showDate?: boolean;
}) {
  const t = useTranslations("session");
  const tCat = useTranslations("session.categories");
  const format = useFormatter();
  const sheetData = sheet as Record<string, unknown>;

  return (
    <div className="border rounded-lg p-4">
      {showDate && (
        <div className="text-sm font-medium mb-3">
          {t("labOn", {
            date: format.dateTime(new Date(sheet.date), {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          })}
        </div>
      )}
      {labCategories.map((category) => {
        const filledFields = category.fields.filter(
          (f) => sheetData[f.key] != null && sheetData[f.key] !== "",
        );
        if (filledFields.length === 0) return null;
        return (
          <div key={category.key} className="mb-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {tCat(category.key)}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filledFields.map((f) => (
                <div key={f.key} className="text-sm border rounded px-2 py-1">
                  <span className="text-muted-foreground">{f.label}: </span>
                  <span className="font-medium">
                    {String(sheetData[f.key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {sheet.extraInvestigations.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {t("extra")}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {sheet.extraInvestigations.map((ei) => (
              <div key={ei.id} className="text-sm border rounded px-2 py-1">
                <span className="text-muted-foreground">{ei.name}: </span>
                <span className="font-medium">{ei.result || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
