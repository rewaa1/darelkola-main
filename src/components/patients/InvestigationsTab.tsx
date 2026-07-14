"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Investigation } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogTrigger as DialogTrigger,
} from "@/components/ui/responsive-dialog";
import {
  Dialog as Lightbox,
  DialogContent as LightboxContent,
  DialogTitle as LightboxTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  FileText,
  Paperclip,
  X,
  CalendarIcon,
  CheckCircle2,
  FlaskConical,
  Undo2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { addInvestigation, deleteInvestigation } from "@/actions/patients";
import {
  setInvestigationResulted,
  removeSessionInvestigation,
  type PatientInvestigationRow,
} from "@/actions/investigations";
import { createInvestigationSheets } from "@/actions/investigation-sheets";
import { InvestigationSheetsEditor } from "./lab/InvestigationSheetsEditor";
import { InvestigationSheetEntry } from "./lab/types";
import { clinicDayLocal } from "@/lib/clinic-day";
import { UploadButton } from "@/lib/uploadthing";
import { investigationSchema, getFieldErrors } from "@/lib/validation";

// Zod schema for file validation (messages injected for i18n)
function buildFileSchema(messages: {
  tooLarge: string;
  typeError: string;
}) {
  return z.object({
    name: z.string(),
    size: z.number().max(20 * 1024 * 1024, messages.tooLarge),
    type: z
      .string()
      .refine(
        (type) =>
          [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf",
          ].includes(type),
        messages.typeError,
      ),
  });
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "avif", "bmp"];

// Uploads are restricted to images and PDFs, so anything with an image
// extension in its (UploadThing-preserved) name is safe to render inline.
function isImageFile(fileName?: string | null, fileUrl?: string | null) {
  const source = fileName || fileUrl || "";
  const ext = source.split("?")[0].split(".").pop()?.toLowerCase();
  return !!ext && IMAGE_EXTENSIONS.includes(ext);
}

interface InvestigationsTabProps {
  patientId: string;
  investigations: Investigation[];
  // Tests the doctor requested across all this patient's sessions, newest first.
  requests: PatientInvestigationRow[];
}

export function InvestigationsTab({
  patientId,
  investigations,
  requests,
}: InvestigationsTabProps) {
  const t = useTranslations("patientTabs.investTab");
  const tCommon = useTranslations("common");
  const tCat = useTranslations("investCategories");
  const formatter = useFormatter();

  const pendingCount = requests.filter((r) => r.status === "REQUESTED").length;

  const handleResulted = (id: string, resulted: boolean) => {
    startTransition(async () => {
      try {
        await setInvestigationResulted(id, resulted);
      } catch {
        toast.error(t("statusFailed"));
      }
    });
  };

  const handleRemoveRequest = (id: string) => {
    startTransition(async () => {
      try {
        await removeSessionInvestigation(id);
        toast.success(t("requestRemoved"));
      } catch {
        toast.error(t("removeFailed"));
      }
    });
  };
  const fileSchema = useMemo(
    () =>
      buildFileSchema({
        tooLarge: t("fileTooLarge"),
        typeError: t("fileTypeError"),
      }),
    [t],
  );
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);
  const [invest, setInvest] = useState("");
  const [report, setReport] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const progressToastId = useRef<string | number | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(
    null,
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setDate(undefined);
    setInvest("");
    setReport("");
    setFileUrl(null);
    setFileName(null);
    setUploadProgress(null);
    setErrors({});
  };

  const handleAdd = () => {
    const result = investigationSchema.safeParse({ date, invest, report });
    const fieldErrors = getFieldErrors(result);
    setErrors(fieldErrors);
    if (!result.success) return;
    startTransition(async () => {
      try {
        await addInvestigation(patientId, {
          date: format(date!, "yyyy-MM-dd"),
          invest,
          report,
          fileUrl: fileUrl || undefined,
          fileName: fileName || undefined,
        });
        // Entered as the result of a doctor's request? Close the loop: the
        // request moves from pending to resulted.
        if (resultTarget) {
          await setInvestigationResulted(resultTarget.id, true);
          setResultTarget(null);
        }
        resetForm();
        setDialogOpen(false);
        toast.success(t("added"));
      } catch {
        toast.error(t("addFailed"));
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteInvestigation(id);
        toast.success(t("removed"));
      } catch {
        toast.error(t("removeFailed"));
      }
    });
  };

  const clearFile = () => {
    setFileUrl(null);
    setFileName(null);
    setUploadProgress(null);
  };

  // ---- Result entry for a requested investigation ----
  // The entry form depends on the test's category: LAB opens the structured
  // lab-sheet editor (the result lands in the Lab Results tab); anything else
  // (imaging, procedures) opens the file/report dialog above, prefilled with
  // the test's name. Saving either marks the request RESULTED.

  // Non-LAB target: reuses the generic investigation dialog.
  const [resultTarget, setResultTarget] =
    useState<PatientInvestigationRow | null>(null);
  // LAB target: opens the lab-sheet dialog.
  const [labTarget, setLabTarget] = useState<PatientInvestigationRow | null>(
    null,
  );
  const [labDrafts, setLabDrafts] = useState<InvestigationSheetEntry[]>([]);

  const openAddResult = (r: PatientInvestigationRow) => {
    if (r.investigation.category === "LAB") {
      setLabDrafts([{ date: clinicDayLocal(), values: {}, extras: [] }]);
      setLabTarget(r);
    } else {
      setResultTarget(r);
      setInvest(r.investigation.name);
      setDate(clinicDayLocal());
      setDialogOpen(true);
    }
  };

  // A sheet with no values and no named extras would save as an empty row.
  const usableLabDrafts = labDrafts.filter(
    (d) =>
      Object.values(d.values).some((v) => v.trim()) ||
      d.extras.some((e) => e.name.trim()),
  );

  const handleSaveLabResult = () => {
    if (!labTarget || usableLabDrafts.length === 0) return;
    const target = labTarget;
    startTransition(async () => {
      try {
        await createInvestigationSheets(
          patientId,
          usableLabDrafts.map((d) => ({
            date: format(d.date, "yyyy-MM-dd"),
            values: d.values,
            extras: d.extras,
          })),
        );
        await setInvestigationResulted(target.id, true);
        setLabTarget(null);
        setLabDrafts([]);
        toast.success(t("resultAdded", { name: target.investigation.name }));
      } catch {
        toast.error(t("addFailed"));
      }
    });
  };

  return (
    <>
      {/* Requested investigations — what the doctor asked for, pending until a
          result is recorded. Aggregated across every session for this patient. */}
      {requests.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              {t("requested")}
              {pendingCount > 0 && (
                <Badge className="bg-amber-600">
                  {t("pendingCount", { count: pendingCount })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requests.map((r) => {
                const resulted = r.status === "RESULTED";
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {tCat(r.investigation.category)}
                        </Badge>
                        <span className="text-sm font-medium">
                          {r.investigation.name}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t("requestedOn", {
                          date: formatter.dateTime(new Date(r.session.date), {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }),
                        })}
                        {r.notes ? ` • ${r.notes}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {resulted ? (
                        <>
                          <Badge className="bg-emerald-600">
                            {t("resulted")}
                          </Badge>
                          {/* Undo an accidental "resulted" — back to pending */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={t("markPending")}
                            onClick={() => handleResulted(r.id, false)}
                            disabled={isPending}
                          >
                            <Undo2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddResult(r)}
                          disabled={isPending}
                        >
                          <Plus className="h-4 w-4 me-1" />
                          {t("addResult")}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemoveRequest(r.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("title")}</CardTitle>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              resetForm();
              setResultTarget(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 me-2" />
              {t("addInvestigation")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("newInvestigation")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Date Picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("date")} *</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={date ? format(date, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const d = e.target.value
                        ? new Date(e.target.value)
                        : undefined;
                      if (d && !isNaN(d.getTime())) {
                        setDate(d);
                      }
                    }}
                    className={`flex-1 ${errors.date ? "border-destructive" : ""}`}
                  />
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => {
                          setDate(d);
                          setDateOpen(false);
                        }}
                        captionLayout="dropdown"
                        fromYear={2020}
                        toYear={new Date().getFullYear()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date}</p>
                )}
              </div>

              {/* Investigation */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  {t("investigation")} *
                </label>
                <Input
                  placeholder={t("investPlaceholder")}
                  value={invest}
                  onChange={(e) => setInvest(e.target.value)}
                  className={errors.invest ? "border-destructive" : ""}
                />
                {errors.invest && (
                  <p className="text-sm text-destructive">{errors.invest}</p>
                )}
              </div>

              {/* Report */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("report")}</label>
                <Input
                  placeholder={t("reportPlaceholder")}
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                />
              </div>

              {/* File Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t("attachment")}</label>
                {fileName ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    {isImageFile(fileName, fileUrl) && fileUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fileUrl}
                        alt={fileName}
                        className="h-10 w-10 shrink-0 rounded-md border object-cover"
                      />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="text-sm truncate flex-1">{fileName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={clearFile}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : uploadProgress !== null ? (
                  <div className="space-y-2 px-3 py-2.5 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("uploading")}
                      </span>
                      <span className="text-sm font-medium">
                        {uploadProgress}%
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                ) : (
                  <UploadButton
                    endpoint="investigationUploader"
                    onBeforeUploadBegin={(files) => {
                      for (const file of files) {
                        const result = fileSchema.safeParse({
                          name: file.name,
                          size: file.size,
                          type: file.type,
                        });
                        if (!result.success) {
                          const errorMsg = result.error.issues[0]?.message;
                          toast.error(errorMsg || t("invalidFile"));
                          throw new Error(errorMsg);
                        }
                      }
                      setUploadProgress(0);
                      progressToastId.current = toast.loading(
                        t("uploadingPct", { progress: 0 }),
                      );
                      return files;
                    }}
                    onUploadProgress={(progress) => {
                      setUploadProgress(progress);
                      if (progressToastId.current) {
                        toast.loading(t("uploadingPct", { progress }), {
                          id: progressToastId.current,
                        });
                      }
                    }}
                    onClientUploadComplete={(res) => {
                      if (progressToastId.current) {
                        toast.dismiss(progressToastId.current);
                        progressToastId.current = null;
                      }
                      if (res?.[0]) {
                        setFileUrl(res[0].ufsUrl);
                        setFileName(res[0].name);
                        setUploadProgress(null);
                        toast.success(t("fileUploaded"));
                      }
                    }}
                    onUploadError={(error: Error) => {
                      if (progressToastId.current) {
                        toast.dismiss(progressToastId.current);
                        progressToastId.current = null;
                      }
                      setUploadProgress(null);
                      toast.error(t("uploadFailed", { message: error.message }));
                    }}
                    appearance={{
                      button:
                        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input !text-foreground !bg-background hover:!bg-accent h-10 px-4 py-2 w-full",
                      allowedContent: "hidden",
                      container: "w-full",
                    }}
                    content={{
                      button({ ready }) {
                        return (
                          <span className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            {ready ? t("attachFile") : tCommon("loading")}
                          </span>
                        );
                      },
                    }}
                  />
                )}
              </div>

              {/* Submit */}
              <Button
                onClick={handleAdd}
                disabled={isPending || !date || !invest}
                className="w-full"
              >
                {isPending ? t("adding") : t("addInvestigation")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Table */}
        {investigations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("noInvestigations")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("investigation")}</TableHead>
                <TableHead>{t("report")}</TableHead>
                <TableHead>{t("attachment")}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investigations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    {formatter.dateTime(new Date(inv.date), {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>{inv.invest}</TableCell>
                  <TableCell>{inv.report || "—"}</TableCell>
                  <TableCell>
                    {inv.fileUrl ? (
                      isImageFile(inv.fileName, inv.fileUrl) ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreview({
                              url: inv.fileUrl!,
                              name: inv.fileName || t("attachment"),
                            })
                          }
                          title={t("viewImage")}
                          className="group block h-11 w-11 overflow-hidden rounded-md border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={inv.fileUrl}
                            alt={inv.fileName || t("attachment")}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </button>
                      ) : (
                        <a
                          href={inv.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={inv.fileName || t("viewFile")}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-md border bg-muted text-primary transition-colors hover:bg-accent"
                        >
                          <FileText className="h-5 w-5" />
                        </a>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(inv.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      </Card>

      {/* Image lightbox */}
      <Lightbox
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <LightboxContent className="p-3 sm:max-w-4xl sm:p-4">
          <LightboxTitle className="sr-only">
            {preview?.name ?? t("attachment")}
          </LightboxTitle>
          {preview && (
            <div className="flex flex-col gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={preview.name}
                className="max-h-[75vh] w-full rounded-md object-contain"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-muted-foreground">
                  {preview.name}
                </span>
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm text-primary hover:underline"
                >
                  {t("openOriginal")}
                </a>
              </div>
            </div>
          )}
        </LightboxContent>
      </Lightbox>

      {/* LAB result entry — the structured sheet editor, same as the Lab
          Results tab. Saving files the sheet under Lab Results and flips the
          request to resulted. */}
      <Dialog
        open={!!labTarget}
        onOpenChange={(open) => {
          if (!open) {
            setLabTarget(null);
            setLabDrafts([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {labTarget
                ? t("addResultFor", { name: labTarget.investigation.name })
                : t("addResult")}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto pe-1">
            <InvestigationSheetsEditor
              sheets={labDrafts}
              onChange={setLabDrafts}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setLabTarget(null)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSaveLabResult}
              disabled={isPending || usableLabDrafts.length === 0}
            >
              {isPending ? t("adding") : t("saveResult")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
