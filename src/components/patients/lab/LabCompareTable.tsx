"use client";

import { Fragment } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { labCategories } from "@/lib/lab-fields";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LabSheet } from "./types";

interface LabCompareTableProps {
  sheets: LabSheet[];
  /** Tints the column(s) belonging to this session and labels them. */
  highlightSessionId?: string;
}

/**
 * Tests down the side, sheet dates across the top — newest first, so the most
 * recent results are the ones already on screen before any scrolling. Only
 * tests with at least one recorded value get a row; a blank cell means that
 * sheet did not include the test.
 */
export function LabCompareTable({
  sheets,
  highlightSessionId,
}: LabCompareTableProps) {
  const t = useTranslations("patientTabs.labTab");
  const tSession = useTranslations("session");
  const tCat = useTranslations("session.categories");
  const format = useFormatter();

  const ordered = [...sheets]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((sheet) => ({
      sheet,
      current: !!highlightSessionId && sheet.sessionId === highlightSessionId,
    }));

  const valueOf = (sheet: LabSheet, key: string) => {
    const raw = (sheet as Record<string, unknown>)[key];
    return raw == null || raw === "" ? null : String(raw);
  };

  // Categories keep only the tests that some sheet actually recorded.
  const rowGroups = labCategories
    .map((category) => ({
      key: category.key,
      fields: category.fields.filter((f) =>
        ordered.some(({ sheet }) => valueOf(sheet, f.key) !== null),
      ),
    }))
    .filter((group) => group.fields.length > 0);

  // Extras are free-text, so the union of their names forms the row set.
  const extraNames = Array.from(
    new Set(
      ordered.flatMap(({ sheet }) =>
        sheet.extraInvestigations.map((e) => e.name),
      ),
    ),
  ).sort();

  if (rowGroups.length === 0 && extraNames.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t("compareEmpty")}
      </p>
    );
  }

  const colCount = ordered.length + 1;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky start-0 bg-background min-w-36">
              {t("test")}
            </TableHead>
            {ordered.map(({ sheet, current }) => (
              <TableHead
                key={sheet.id}
                className={`whitespace-nowrap ${current ? "bg-primary/5 text-foreground" : ""}`}
              >
                <div>
                  {format.dateTime(new Date(sheet.date), {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div
                  className={`text-xs font-normal ${current ? "text-primary" : "text-muted-foreground"}`}
                >
                  {current
                    ? t("thisSession")
                    : sheet.session
                      ? t("fromSession", {
                          date: format.dateTime(new Date(sheet.session.date), {
                            month: "short",
                            day: "numeric",
                          }),
                        })
                      : t("pending")}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowGroups.map((group) => (
            <Fragment key={group.key}>
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={colCount}
                  className="bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {tCat(group.key)}
                </TableCell>
              </TableRow>
              {group.fields.map((field) => (
                <TableRow key={field.key}>
                  <TableCell className="sticky start-0 bg-background font-medium">
                    {field.label}
                  </TableCell>
                  {ordered.map(({ sheet, current }) => (
                    <TableCell
                      key={sheet.id}
                      className={`whitespace-nowrap ${current ? "bg-primary/5" : ""}`}
                    >
                      {valueOf(sheet, field.key) ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </Fragment>
          ))}

          {extraNames.length > 0 && (
            <>
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={colCount}
                  className="bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {tSession("extra")}
                </TableCell>
              </TableRow>
              {extraNames.map((name) => (
                <TableRow key={name}>
                  <TableCell className="sticky start-0 bg-background font-medium">
                    {name}
                  </TableCell>
                  {ordered.map(({ sheet, current }) => {
                    const match = sheet.extraInvestigations.find(
                      (e) => e.name === name,
                    );
                    return (
                      <TableCell
                        key={sheet.id}
                        className={current ? "bg-primary/5" : ""}
                      >
                        {match?.result || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
