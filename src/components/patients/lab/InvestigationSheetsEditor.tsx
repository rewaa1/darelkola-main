"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { labCategories } from "@/lib/lab-fields";
import { InvestigationSheetEntry } from "./types";

interface InvestigationSheetsEditorProps {
  sheets: InvestigationSheetEntry[];
  onChange: (sheets: InvestigationSheetEntry[]) => void;
}

export function InvestigationSheetsEditor({
  sheets,
  onChange,
}: InvestigationSheetsEditorProps) {
  const t = useTranslations("session");
  const tCat = useTranslations("session.categories");
  const tCommon = useTranslations("common");

  // Replace one sheet with a modified copy, leaving the rest untouched.
  const patchSheet = (
    index: number,
    patch: (sheet: InvestigationSheetEntry) => InvestigationSheetEntry,
  ) => onChange(sheets.map((s, i) => (i === index ? patch(s) : s)));

  const addSheet = () =>
    onChange([...sheets, { date: new Date(), values: {}, extras: [] }]);

  const removeSheet = (index: number) =>
    onChange(sheets.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("sheetCount", { count: sheets.length })}
        </p>
        <Button variant="outline" size="sm" onClick={addSheet}>
          <Plus className="h-4 w-4 me-2" />
          {t("addSheet")}
        </Button>
      </div>

      {sheets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t("noSheets")}
        </p>
      ) : (
        <div className="space-y-4">
          {sheets.map((sheet, sheetIdx) => (
            <div key={sheetIdx} className="border rounded-lg p-4 space-y-4">
              {/* Sheet header — the date the tests were performed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">{t("date")}:</label>
                  <Input
                    type="date"
                    value={format(sheet.date, "yyyy-MM-dd")}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime()))
                        patchSheet(sheetIdx, (s) => ({ ...s, date: d }));
                    }}
                    className="w-44 h-8"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeSheet(sheetIdx)}
                  aria-label={t("removeSheet")}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>

              {/* Lab categories as accordion */}
              <Accordion type="multiple" className="w-full">
                {labCategories.map((category) => (
                  <AccordionItem key={category.key} value={category.key}>
                    <AccordionTrigger className="text-sm py-2">
                      {tCat(category.key)}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {category.fields.map((field) => (
                          <div key={field.key} className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              {field.label}
                            </label>
                            <Input
                              value={sheet.values[field.key] || ""}
                              onChange={(e) =>
                                patchSheet(sheetIdx, (s) => ({
                                  ...s,
                                  values: {
                                    ...s.values,
                                    [field.key]: e.target.value,
                                  },
                                }))
                              }
                              className="h-8 text-sm"
                              placeholder={field.label}
                            />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Extra investigations */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">
                    {t("extraInvestigations")}
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      patchSheet(sheetIdx, (s) => ({
                        ...s,
                        extras: [...s.extras, { name: "", result: "" }],
                      }))
                    }
                  >
                    <Plus className="h-3 w-3 me-1" />
                    {tCommon("add")}
                  </Button>
                </div>
                {sheet.extras.map((extra, extraIdx) => (
                  <div key={extraIdx} className="flex gap-2 mb-2 items-center">
                    <Input
                      placeholder={t("testName")}
                      value={extra.name}
                      onChange={(e) =>
                        patchSheet(sheetIdx, (s) => ({
                          ...s,
                          extras: s.extras.map((x, i) =>
                            i === extraIdx ? { ...x, name: e.target.value } : x,
                          ),
                        }))
                      }
                      className="h-8 text-sm flex-1"
                    />
                    <Input
                      placeholder={t("result")}
                      value={extra.result}
                      onChange={(e) =>
                        patchSheet(sheetIdx, (s) => ({
                          ...s,
                          extras: s.extras.map((x, i) =>
                            i === extraIdx
                              ? { ...x, result: e.target.value }
                              : x,
                          ),
                        }))
                      }
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() =>
                        patchSheet(sheetIdx, (s) => ({
                          ...s,
                          extras: s.extras.filter((_, i) => i !== extraIdx),
                        }))
                      }
                      aria-label={tCommon("delete")}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
