"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Plus, Trash2, FlaskConical, Rows3, Columns3 } from "lucide-react";
import {
  createInvestigationSheets,
  deleteInvestigationSheet,
} from "@/actions/investigation-sheets";
import { InvestigationSheetView } from "./lab/InvestigationSheetView";
import { InvestigationSheetsEditor } from "./lab/InvestigationSheetsEditor";
import { LabCompareTable } from "./lab/LabCompareTable";
import { InvestigationSheetEntry, LabSheet } from "./lab/types";

interface LabResultsTabProps {
  patientId: string;
  sheets: LabSheet[];
  /**
   * Called after a sheet is added or removed. Needed where `sheets` comes from
   * client state rather than a server component, since `revalidatePath` cannot
   * reach it — the queue's current-patient view, for one.
   */
  onChanged?: () => void;
}

type View = "sheets" | "compare";

export function LabResultsTab({
  patientId,
  sheets,
  onChanged,
}: LabResultsTabProps) {
  const t = useTranslations("patientTabs.labTab");
  const tCommon = useTranslations("common");
  const formatter = useFormatter();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<View>("sheets");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drafts, setDrafts] = useState<InvestigationSheetEntry[]>([]);

  const openDialog = () => {
    setDrafts([{ date: new Date(), values: {}, extras: [] }]);
    setDialogOpen(true);
  };

  // A sheet with no values and no named extras would save as an empty row.
  const usableDrafts = drafts.filter(
    (d) =>
      Object.values(d.values).some((v) => v.trim()) ||
      d.extras.some((e) => e.name.trim()),
  );

  const handleSave = () => {
    if (usableDrafts.length === 0) return;
    startTransition(async () => {
      try {
        await createInvestigationSheets(
          patientId,
          usableDrafts.map((d) => ({
            date: format(d.date, "yyyy-MM-dd"),
            values: d.values,
            extras: d.extras,
          })),
        );
        setDialogOpen(false);
        setDrafts([]);
        router.refresh();
        onChanged?.();
        toast.success(t("added", { count: usableDrafts.length }));
      } catch {
        toast.error(t("addFailed"));
      }
    });
  };

  const handleDelete = (sheetId: string) => {
    startTransition(async () => {
      try {
        await deleteInvestigationSheet(sheetId);
        router.refresh();
        onChanged?.();
        toast.success(t("removed"));
      } catch {
        toast.error(t("removeFailed"));
      }
    });
  };

  const pendingCount = sheets.filter((s) => !s.session).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            <CardTitle>
              {t("title")}
              {sheets.length > 0 && (
                <span className="text-muted-foreground font-normal ms-1">
                  ({sheets.length})
                </span>
              )}
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {sheets.length > 1 && (
              <div className="flex rounded-md border p-0.5">
                <Button
                  variant={view === "sheets" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7"
                  onClick={() => setView("sheets")}
                >
                  <Rows3 className="h-3.5 w-3.5 me-1.5" />
                  {t("viewSheets")}
                </Button>
                <Button
                  variant={view === "compare" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7"
                  onClick={() => setView("compare")}
                >
                  <Columns3 className="h-3.5 w-3.5 me-1.5" />
                  {t("viewCompare")}
                </Button>
              </div>
            )}
            <Button size="sm" onClick={openDialog}>
              <Plus className="h-4 w-4 me-2" />
              {t("addSheets")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingCount > 0 && (
            <p className="mb-4 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              {t("pendingHint", { count: pendingCount })}
            </p>
          )}

          {sheets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("noSheets")}
            </p>
          ) : view === "compare" ? (
            <LabCompareTable sheets={sheets} />
          ) : (
            <div className="space-y-4">
              {sheets.map((sheet) => (
                <div key={sheet.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm">
                        {formatter.dateTime(new Date(sheet.date), {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {sheet.session ? (
                        <Badge variant="secondary" className="font-normal">
                          {t("fromSession", {
                            date: formatter.dateTime(
                              new Date(sheet.session.date),
                              { year: "numeric", month: "short", day: "numeric" },
                            ),
                          })}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          {t("pending")}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleDelete(sheet.id)}
                      disabled={isPending}
                      aria-label={tCommon("delete")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <InvestigationSheetView sheet={sheet} showDate={false} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDrafts([]);
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("newSheets")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto pe-1">
            <InvestigationSheetsEditor sheets={drafts} onChange={setDrafts} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || usableDrafts.length === 0}
            >
              {isPending
                ? t("saving")
                : t("saveSheets", { count: usableDrafts.length })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
