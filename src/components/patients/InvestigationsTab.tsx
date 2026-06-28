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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { addInvestigation, deleteInvestigation } from "@/actions/patients";
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

interface InvestigationsTabProps {
  patientId: string;
  investigations: Investigation[];
}

export function InvestigationsTab({
  patientId,
  investigations,
}: InvestigationsTabProps) {
  const t = useTranslations("patientTabs.investTab");
  const tCommon = useTranslations("common");
  const formatter = useFormatter();
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
  const [invest, setInvest] = useState("");
  const [report, setReport] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const progressToastId = useRef<string | number | null>(null);

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("title")}</CardTitle>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
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
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {inv.report || "—"}
                      {inv.fileUrl && (
                        <a
                          href={inv.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={inv.fileName || t("viewFile")}
                        >
                          <FileText className="h-4 w-4 text-primary hover:text-primary/80" />
                        </a>
                      )}
                    </div>
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
  );
}
