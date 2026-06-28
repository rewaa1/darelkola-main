import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Trash2, Plus, FlaskConical } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { labCategories } from "./InvestigationSheetView";
import { InvestigationSheetEntry } from "./types";

interface InvestigationSheetsCardProps {
  sheets: InvestigationSheetEntry[];
  onAddSheet: () => void;
  onRemoveSheet: (index: number) => void;
  onUpdateDate: (index: number, date: Date) => void;
  onUpdateValue: (index: number, key: string, value: string) => void;
  onAddExtra: (index: number) => void;
  onUpdateExtra: (
    sheetIdx: number,
    extraIdx: number,
    field: "name" | "result",
    value: string,
  ) => void;
  onRemoveExtra: (sheetIdx: number, extraIdx: number) => void;
}

export function InvestigationSheetsCard({
  sheets,
  onAddSheet,
  onRemoveSheet,
  onUpdateDate,
  onUpdateValue,
  onAddExtra,
  onUpdateExtra,
  onRemoveExtra,
}: InvestigationSheetsCardProps) {
  const t = useTranslations("session");
  const tCat = useTranslations("session.categories");
  const tCommon = useTranslations("common");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            <CardTitle>{t("investigationSheets")}</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={onAddSheet}>
            <Plus className="h-4 w-4 me-2" />
            {t("addSheet")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sheets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noSheets")}
          </p>
        ) : (
          <div className="space-y-4">
            {sheets.map((sheet, sheetIdx) => (
              <div key={sheetIdx} className="border rounded-lg p-4 space-y-4">
                {/* Sheet header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">
                      {t("date")}:
                    </label>
                    <Input
                      type="date"
                      value={format(sheet.date, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        if (!isNaN(d.getTime())) onUpdateDate(sheetIdx, d);
                      }}
                      className="w-44 h-8"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onRemoveSheet(sheetIdx)}
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
                                  onUpdateValue(
                                    sheetIdx,
                                    field.key,
                                    e.target.value,
                                  )
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
                      onClick={() => onAddExtra(sheetIdx)}
                    >
                      <Plus className="h-3 w-3 me-1" />
                      {tCommon("add")}
                    </Button>
                  </div>
                  {sheet.extras.map((extra, extraIdx) => (
                    <div
                      key={extraIdx}
                      className="flex gap-2 mb-2 items-center"
                    >
                      <Input
                        placeholder={t("testName")}
                        value={extra.name}
                        onChange={(e) =>
                          onUpdateExtra(
                            sheetIdx,
                            extraIdx,
                            "name",
                            e.target.value,
                          )
                        }
                        className="h-8 text-sm flex-1"
                      />
                      <Input
                        placeholder={t("result")}
                        value={extra.result}
                        onChange={(e) =>
                          onUpdateExtra(
                            sheetIdx,
                            extraIdx,
                            "result",
                            e.target.value,
                          )
                        }
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => onRemoveExtra(sheetIdx, extraIdx)}
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
      </CardContent>
    </Card>
  );
}
