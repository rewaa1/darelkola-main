"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Patient, PersonalHistory } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Loader2,
  UserPlus,
  ChevronRight,
  Phone,
  Users,
  ArrowUpDown,
} from "lucide-react";
import { getPaginatedPatients } from "@/actions/patients";
import { NewPatientDialog } from "@/components/patients";
import { useDebounce } from "@/hooks";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInYears } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { CardListSkeleton, DataTableSkeleton } from "@/components/skeletons";

type PatientWithHistory = Patient & { personalHistory: PersonalHistory | null };

function calculateAge(dateOfBirth: Date): number {
  return differenceInYears(new Date(), new Date(dateOfBirth));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function usePatientColumns(): ColumnDef<PatientWithHistory>[] {
  const t = useTranslations("patients");
  const tCol = useTranslations("patients.columns");
  const tPatient = useTranslations("patient");
  const tSex = useTranslations("patient.sex");
  const format = useFormatter();

  return [
    {
      id: "name",
      accessorFn: (row) => row.personalHistory?.fullName || t("unknown"),
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ms-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {tCol("patient")}
          <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-foreground font-semibold text-xs bg-primary">
              {getInitials(name)}
            </div>
            <span className="font-medium">{name}</span>
          </div>
        );
      },
      filterFn: "includesString",
    },
    {
      id: "age",
      accessorFn: (row) =>
        row.personalHistory?.dateOfBirth
          ? calculateAge(row.personalHistory.dateOfBirth)
          : null,
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ms-3"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {tCol("age")}
          <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const age = row.getValue("age") as number | null;
        return age !== null ? (
          <span>{tPatient("years", { count: age })}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "sex",
      accessorFn: (row) => row.personalHistory?.sex || null,
      header: () => tCol("sex"),
      cell: ({ row }) => {
        const sex = row.getValue("sex") as string | null;
        return sex ? (
          <Badge variant="outline">
            {tSex.has(sex) ? tSex(sex) : sex}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "phone",
      accessorFn: (row) => row.personalHistory?.phoneNumber || "",
      header: () => tCol("phone"),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string;
        return phone ? (
          <span className="font-mono text-sm">{phone}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
      filterFn: "includesString",
    },
    {
      id: "registered",
      accessorFn: (row) => new Date(row.createdAt).getTime(),
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ms-3 hidden lg:flex"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {tCol("registered")}
          <ArrowUpDown className="ms-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground hidden lg:block">
          {format.dateTime(new Date(row.original.createdAt), {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link href={`/patients/${row.original.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];
}

export function PatientsPageClient() {
  const t = useTranslations("patients");
  const tPatient = useTranslations("patient");
  const tSex = useTranslations("patient.sex");
  const columns = usePatientColumns();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();

  // Server-side pagination state for desktop
  const [desktopPage, setDesktopPage] = useState(1);
  const [desktopPageSize, setDesktopPageSize] = useState(15);
  const [desktopData, setDesktopData] = useState<PatientWithHistory[]>([]);
  const [desktopTotal, setDesktopTotal] = useState(0);
  const [desktopLoading, setDesktopLoading] = useState(false);

  const filters = useMemo(
    () => ({ search: debouncedQuery || undefined }),
    [debouncedQuery],
  );

  // Mobile infinite scroll
  const {
    items: mobilePatients,
    isLoading: mobileLoading,
    hasMore,
    sentinelRef,
    reset: resetMobile,
  } = useInfiniteScroll<PatientWithHistory, { search?: string }>({
    fetcher: getPaginatedPatients,
    pageSize: DEFAULT_PAGE_SIZE,
    filters,
  });

  // Desktop: fetch page data when page/pageSize/search changes
  const fetchDesktopPage = useCallback(
    async (p: number, ps: number, search?: string) => {
      setDesktopLoading(true);
      try {
        const result = await getPaginatedPatients({
          page: p,
          pageSize: ps,
          search,
        });
        setDesktopData(result.data as PatientWithHistory[]);
        setDesktopTotal(result.totalCount);
      } finally {
        setDesktopLoading(false);
      }
    },
    [],
  );

  // Fetch desktop data when dependencies change
  useEffect(() => {
    fetchDesktopPage(desktopPage, desktopPageSize, debouncedQuery || undefined);
  }, [desktopPage, desktopPageSize, debouncedQuery, fetchDesktopPage]);

  // Reset desktop page when search changes
  useEffect(() => {
    setDesktopPage(1);
  }, [debouncedQuery]);

  const handleRefresh = () => {
    resetMobile();
    fetchDesktopPage(1, desktopPageSize, debouncedQuery || undefined);
    setDesktopPage(1);
  };

  const isLoading = mobileLoading || desktopLoading;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <NewPatientDialog onSuccess={handleRefresh}>
          <Button size="sm">
            <UserPlus className="me-2 h-4 w-4" />
            {t("newPatient")}
          </Button>
        </NewPatientDialog>
      </div>

      {/* Search */}
      <div className="relative sm:max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ps-10"
        />
        {isLoading && (
          <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Mobile: Infinite scroll card list */}
      <div className="space-y-1.5 md:hidden">
        {mobileLoading && mobilePatients.length === 0 && <CardListSkeleton />}

        {mobilePatients.map((patient) => {
          const name = patient.personalHistory?.fullName || t("unknown");
          const phone = patient.personalHistory?.phoneNumber;
          const dob = patient.personalHistory?.dateOfBirth;
          const sex = patient.personalHistory?.sex;

          return (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary-foreground font-semibold text-sm bg-primary">
                      {getInitials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {phone}
                          </span>
                        )}
                        {dob && (
                          <span>
                            {tPatient("years", { count: calculateAge(dob) })}
                          </span>
                        )}
                        {sex && (
                          <span>{tSex.has(sex) ? tSex(sex) : sex}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {/* Sentinel for infinite scroll */}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Mobile empty state */}
        {mobilePatients.length === 0 && !mobileLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">{t("noPatients")}</p>
              {query && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t("tryDifferent")}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop: DataTable with server-side pagination */}
      <div className="hidden md:block">
        {desktopLoading && desktopData.length === 0 ? (
          <DataTableSkeleton columns={5} />
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
            onRowClick={(patient) => router.push(`/patients/${patient.id}`)}
          />
        )}
      </div>
    </div>
  );
}
