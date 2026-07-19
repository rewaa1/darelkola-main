import { useMemo, useState } from "react";
import { InvestigationCatalog } from "@prisma/client";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, FlaskConical, Plus, Check, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { InvestigationEntry } from "./types";
import { INVESTIGATION_CATEGORIES } from "./investigation-categories";
import { groupCatalog } from "./investigation-groups";

export type CatalogStatus = "loading" | "error" | "ready";

interface InvestigationRequestsCardProps {
  selected: InvestigationEntry[];
  catalog: InvestigationCatalog[];
  catalogStatus: CatalogStatus;
  onRetryLoad: () => void;
  onToggle: (item: InvestigationCatalog) => void;
  /** Resolves true when the test was created (or already existed) and added. */
  onAddNew: (name: string, category: string) => Promise<boolean>;
  onRemove: (index: number) => void;
  onUpdateNotes: (index: number, notes: string) => void;
}

export function InvestigationRequestsCard({
  selected,
  catalog,
  catalogStatus,
  onRetryLoad,
  onToggle,
  onAddNew,
  onRemove,
  onUpdateNotes,
}: InvestigationRequestsCardProps) {
  const t = useTranslations("session");
  const tCat = useTranslations("investCategories");
  const tGroup = useTranslations("investGroups");

  const groups = useMemo(() => groupCatalog(catalog), [catalog]);
  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.investigation.id)),
    [selected],
  );

  const [creatingNew, setCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string>("LAB");

  const confirmCreate = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    const ok = await onAddNew(name, newCategory);
    setSaving(false);
    // On failure the panel stays open with the typed name intact.
    if (ok) {
      setCreatingNew(false);
      setNewName("");
      setNewCategory("LAB");
    }
  };

  const cancelCreate = () => {
    setCreatingNew(false);
    setNewName("");
    setNewCategory("LAB");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            <CardTitle>{t("requestedInvestigations")}</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {t("requestedCount", { count: selected.length })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* The catalog, grouped the way the lab sheet groups tests — tap to
            request, tap again to remove. */}
        {catalogStatus === "loading" && (
          <div className="space-y-3" aria-hidden>
            {[5, 8, 4].map((count, g) => (
              <div key={g} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: count }, (_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {catalogStatus === "error" && (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-sm text-muted-foreground">
              {t("catalogLoadFailed")}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRetryLoad}>
              <RotateCw className="h-3.5 w-3.5 me-1" />
              {t("retry")}
            </Button>
          </div>
        )}

        {catalogStatus === "ready" && catalog.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noInvestCatalog")}
          </p>
        )}

        {catalogStatus === "ready" && groups.length > 0 && (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.key} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {tGroup(group.key)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onToggle(item)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted",
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* A test the catalog doesn't have yet — created with its category so
            it's filed correctly and shows up in the list next time. */}
        {catalogStatus === "ready" && !creatingNew && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreatingNew(true)}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {t("addCustomInvest")}
          </Button>
        )}
        {creatingNew && (
          <div className="border border-dashed rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t("addCustomInvest")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {t("customInvestName")}
                </label>
                <Input
                  autoFocus
                  placeholder={t("customInvestNamePlaceholder")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmCreate();
                    }
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {t("category")}
                </label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTIGATION_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {tCat(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={confirmCreate}
                disabled={!newName.trim() || saving}
              >
                {saving ? t("creatingInvest") : t("createAndAdd")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelCreate}
                disabled={saving}
              >
                {t("cancelCreate")}
              </Button>
            </div>
          </div>
        )}

        {/* Selected list — same row anatomy as MedicationsCard: name line on
            top, the editable field below it. */}
        {selected.length > 0 && (
          <div className="space-y-2">
            {selected.map((entry, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {tCat(entry.investigation.category)}
                    </Badge>
                    <span className="font-medium text-sm truncate">
                      {entry.investigation.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <Input
                  placeholder={t("investNotesPlaceholder")}
                  value={entry.notes}
                  onChange={(e) => onUpdateNotes(index, e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {selected.length === 0 && catalogStatus === "ready" && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noInvestRequested")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
