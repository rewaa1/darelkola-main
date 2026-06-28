"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumn?: string;
  filterValue?: string;
  onRowClick?: (row: TData) => void;

  // Server-side pagination props
  /** Total row count from server (enables server-side pagination when set) */
  totalCount?: number;
  /** Current page (1-indexed) */
  page?: number;
  /** Page size */
  pageSize?: number;
  /** Called when the user navigates to a different page (1-indexed) */
  onPageChange?: (page: number) => void;
  /** Called when the user changes the page size */
  onPageSizeChange?: (pageSize: number) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterValue,
  onRowClick,
  totalCount,
  page,
  pageSize: pageSizeProp,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<TData, TValue>) {
  const isServerPagination =
    totalCount !== undefined &&
    page !== undefined &&
    onPageChange !== undefined;

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // Server-side pagination state
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: (page ?? 1) - 1,
    pageSize: pageSizeProp ?? 15,
  });

  // Sync external page prop to internal state
  React.useEffect(() => {
    if (page !== undefined) {
      setPagination((prev) => ({ ...prev, pageIndex: page - 1 }));
    }
  }, [page]);

  React.useEffect(() => {
    if (pageSizeProp !== undefined) {
      setPagination((prev) => ({ ...prev, pageSize: pageSizeProp }));
    }
  }, [pageSizeProp]);

  // Apply external filter
  React.useEffect(() => {
    if (filterColumn && filterValue !== undefined) {
      setColumnFilters([{ id: filterColumn, value: filterValue }]);
    } else {
      setColumnFilters([]);
    }
  }, [filterColumn, filterValue]);

  const serverPageCount = isServerPagination
    ? Math.ceil(totalCount / pagination.pageSize)
    : undefined;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      ...(isServerPagination ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: isServerPagination ? undefined : getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(isServerPagination
      ? {
          manualPagination: true,
          pageCount: serverPageCount,
          onPaginationChange: (updater) => {
            const newState =
              typeof updater === "function" ? updater(pagination) : updater;
            setPagination(newState);
            if (newState.pageIndex !== pagination.pageIndex) {
              onPageChange(newState.pageIndex + 1);
            }
            if (newState.pageSize !== pagination.pageSize) {
              onPageSizeChange?.(newState.pageSize);
            }
          },
        }
      : {
          initialState: { pagination: { pageSize: 15 } },
        }),
  });

  const displayedTotal = isServerPagination
    ? totalCount
    : table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined
                  }
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-sm text-muted-foreground hidden sm:block">
            {displayedTotal} total
          </div>
          <div className="flex items-center gap-4 sm:gap-6 ml-auto">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm text-muted-foreground">Rows</span>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 15, 25, 50].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm font-medium whitespace-nowrap">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hidden sm:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hidden sm:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
