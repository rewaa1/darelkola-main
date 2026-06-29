"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import { Medication } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogTrigger as DialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Plus, Trash2, Pill, Loader2, Search, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import {
  createMedication,
  deleteMedication,
  getPaginatedMedications,
} from "@/actions/medications";
import { medicationSchema, getFieldErrors } from "@/lib/validation";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { CardListSkeleton, DataTableSkeleton } from "@/components/skeletons";

function useMedicationColumns(): ColumnDef<Medication>[] {
  const t = useTranslations("medications");
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ms-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("name")}
          <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      id: "dosage",
      accessorKey: "dosage",
      header: () => t("dosage"),
      cell: ({ row }) => <span>{row.original.dosage || "—"}</span>,
    },
    {
      id: "form",
      accessorKey: "form",
      header: () => t("form"),
      cell: ({ row }) => (
        <span className="capitalize">{row.original.form || "—"}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <DeleteMedButton id={row.original.id} />,
    },
  ];
}

function DeleteMedButton({ id }: { id: string }) {
  const t = useTranslations("medications");
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      disabled={isPending}
      onClick={(e) => {
        e.stopPropagation();
        startTransition(async () => {
          try {
            await deleteMedication(id);
            toast.success(t("removed"));
            window.location.reload();
          } catch {
            toast.error(t("removeFailed"));
          }
        });
      }}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4 text-destructive" />
      )}
    </Button>
  );
}

export function MedicationsPageClient() {
  const t = useTranslations("medications");
  const columns = useMedicationColumns();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [form, setForm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filters = useMemo(
    () => ({ search: debouncedSearch || undefined }),
    [debouncedSearch],
  );

  // Mobile: infinite scroll
  const {
    items: mobileMeds,
    isLoading: mobileLoading,
    hasMore,
    sentinelRef,
    reset: resetMobile,
  } = useInfiniteScroll<Medication, { search?: string }>({
    fetcher: getPaginatedMedications,
    pageSize: DEFAULT_PAGE_SIZE,
    filters,
  });

  // Desktop: server-side pagination
  const [desktopPage, setDesktopPage] = useState(1);
  const [desktopPageSize, setDesktopPageSize] = useState(15);
  const [desktopData, setDesktopData] = useState<Medication[]>([]);
  const [desktopTotal, setDesktopTotal] = useState(0);
  const [desktopLoading, setDesktopLoading] = useState(false);

  const fetchDesktopPage = useCallback(
    async (p: number, ps: number, search?: string) => {
      setDesktopLoading(true);
      try {
        const result = await getPaginatedMedications({
          page: p,
          pageSize: ps,
          search,
        });
        setDesktopData(result.data as Medication[]);
        setDesktopTotal(result.totalCount);
      } finally {
        setDesktopLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchDesktopPage(
      desktopPage,
      desktopPageSize,
      debouncedSearch || undefined,
    );
  }, [desktopPage, desktopPageSize, debouncedSearch, fetchDesktopPage]);

  useEffect(() => {
    setDesktopPage(1);
  }, [debouncedSearch]);

  const handleAdd = () => {
    const result = medicationSchema.safeParse({ name, dosage, form });
    const fieldErrors = getFieldErrors(result);
    setErrors(fieldErrors);
    if (!result.success) return;
    startTransition(async () => {
      try {
        await createMedication({
          name,
          dosage: dosage || undefined,
          form: form || undefined,
        });
        setName("");
        setDosage("");
        setForm("");
        setDialogOpen(false);
        toast.success(t("added"));
        resetMobile();
        fetchDesktopPage(1, desktopPageSize, debouncedSearch || undefined);
        setDesktopPage(1);
      } catch {
        toast.error(t("addFailed"));
      }
    });
  };

  const isLoading = mobileLoading || desktopLoading;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Pill className="h-6 w-6" />
          <h1 className="text-xl sm:text-2xl font-bold">{t("title")}</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 me-2" />
              {t("addMedication")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("newMedication")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium">{t("name")} *</label>
                <Input
                  placeholder={t("namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">{t("dosage")}</label>
                <Input
                  placeholder={t("dosagePlaceholder")}
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("form")}</label>
                <Input
                  placeholder={t("formPlaceholder")}
                  value={form}
                  onChange={(e) => setForm(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={isPending || !name}
                className="w-full"
              >
                {isPending ? t("adding") : t("addMedication")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative sm:max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-10"
        />
        {isLoading && (
          <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Mobile: Infinite scroll card list */}
      <div className="space-y-1.5 md:hidden">
        {mobileLoading && mobileMeds.length === 0 && <CardListSkeleton />}

        {mobileMeds.map((med) => (
          <Card key={med.id} className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium text-sm">{med.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {med.dosage && <span>{med.dosage}</span>}
                  {med.form && <span className="capitalize">{med.form}</span>}
                </div>
              </div>
              <DeleteMedButton id={med.id} />
            </CardContent>
          </Card>
        ))}

        {/* Sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {mobileMeds.length === 0 && !mobileLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Pill className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">{t("empty")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop: DataTable with server-side pagination */}
      <div className="hidden md:block">
        {desktopLoading && desktopData.length === 0 ? (
          <DataTableSkeleton columns={4} />
        ) : (
          <DataTable
            columns={columns}
            data={desktopData}
            totalCount={desktopTotal}
            page={desktopPage}
            pageSize={desktopPageSize}
            onPageChange={setDesktopPage}
            onPageSizeChange={(size) => {
              setDesktopPageSize(size);
              setDesktopPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
