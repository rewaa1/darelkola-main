import { useState } from "react";
import { InvestigationCatalog } from "@prisma/client";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, FlaskConical } from "lucide-react";
import { InvestigationEntry } from "./types";
import { INVESTIGATION_CATEGORIES } from "./investigation-categories";

interface InvestigationRequestsCardProps {
  selected: InvestigationEntry[];
  search: string;
  results: InvestigationCatalog[];
  onSearch: (query: string) => void;
  onAdd: (item: InvestigationCatalog) => void;
  onAddNew: (name: string, category: string) => void;
  onRemove: (index: number) => void;
  onUpdateNotes: (index: number, notes: string) => void;
}

export function InvestigationRequestsCard({
  selected,
  search,
  results,
  onSearch,
  onAdd,
  onAddNew,
  onRemove,
  onUpdateNotes,
}: InvestigationRequestsCardProps) {
  const t = useTranslations("session");
  const tCat = useTranslations("investCategories");

  const [creatingNew, setCreatingNew] = useState(false);
  const [newCategory, setNewCategory] = useState<string>("LAB");

  const startCreate = () => {
    setNewCategory("LAB");
    setCreatingNew(true);
  };

  const confirmCreate = () => {
    onAddNew(search.trim(), newCategory);
    setCreatingNew(false);
    setNewCategory("LAB");
  };

  const cancelCreate = () => {
    setCreatingNew(false);
    setNewCategory("LAB");
    onSearch("");
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
      <CardContent className="space-y-4">
        {/* Search catalog */}
        <div className="relative">
          <Input
            placeholder={t("searchInvestPlaceholder")}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            disabled={creatingNew}
          />
          {!creatingNew && (results.length > 0 || search.length >= 2) && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
              {results.map((item) => (
                <button
                  key={item.id}
                  className="w-full text-start px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                  onClick={() => onAdd(item)}
                >
                  <span>{item.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {tCat(item.category)}
                  </Badge>
                </button>
              ))}
              {results.length === 0 && search.length >= 2 && (
                <button
                  className="w-full text-start px-3 py-2 text-sm hover:bg-muted text-primary"
                  onClick={startCreate}
                >
                  {t("createInvest", { name: search })}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Inline new-test panel — captures the category so the catalog entry is
            filed correctly. */}
        {creatingNew && (
          <div className="border border-dashed rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {t("createInvest", { name: search })}
              </span>
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
            <div className="flex gap-2">
              <Button size="sm" onClick={confirmCreate}>
                {t("createAndAdd")}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelCreate}>
                {t("cancelCreate")}
              </Button>
            </div>
          </div>
        )}

        {/* Selected list */}
        {selected.length > 0 && (
          <div className="space-y-2">
            {selected.map((entry, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 flex items-center gap-2"
              >
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {tCat(entry.investigation.category)}
                </Badge>
                <span className="font-medium text-sm shrink-0">
                  {entry.investigation.name}
                </span>
                <Input
                  placeholder={t("investNotesPlaceholder")}
                  value={entry.notes}
                  onChange={(e) => onUpdateNotes(index, e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {selected.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noInvestRequested")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
