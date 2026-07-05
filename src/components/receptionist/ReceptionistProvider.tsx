"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserCircle2 } from "lucide-react";

export type ReceptionistOption = { id: string; name: string };

export type RequireResult = {
  /** false only when the receptionist was asked to pick and cancelled. */
  ok: boolean;
  receptionistId: string | null;
  receptionistName: string | null;
};

const NO_PROMPT: RequireResult = {
  ok: true,
  receptionistId: null,
  receptionistName: null,
};

type Ctx = {
  promptRequired: boolean;
  receptionists: ReceptionistOption[];
  /**
   * Ask which receptionist is performing the action. Resolves immediately with
   * a null id when no prompt is required (doctor session, or none configured).
   * Resolves with { ok: false } if the receptionist cancels the picker.
   */
  requireReceptionist: () => Promise<RequireResult>;
};

const ReceptionistContext = React.createContext<Ctx | null>(null);

const LAST_USED_KEY = "darelkola.lastReceptionistId";

export function ReceptionistProvider({
  promptRequired,
  receptionists,
  children,
}: {
  promptRequired: boolean;
  receptionists: ReceptionistOption[];
  children: React.ReactNode;
}) {
  const t = useTranslations("receptionistPicker");
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const resolverRef = React.useRef<((r: RequireResult) => void) | null>(null);

  const settle = React.useCallback((result: RequireResult) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOpen(false);
    resolve?.(result);
  }, []);

  const requireReceptionist = React.useCallback((): Promise<RequireResult> => {
    // Doctors aren't prompted; neither is anyone until names are configured.
    if (!promptRequired || receptionists.length === 0) {
      return Promise.resolve(NO_PROMPT);
    }

    // Pre-select the last-used receptionist (falls back to the first name).
    let initial = receptionists[0].id;
    try {
      const stored = window.localStorage.getItem(LAST_USED_KEY);
      if (stored && receptionists.some((r) => r.id === stored)) initial = stored;
    } catch {
      // localStorage may be unavailable; the default is fine.
    }
    setSelectedId(initial);
    setOpen(true);

    return new Promise<RequireResult>((resolve) => {
      resolverRef.current = resolve;
    });
  }, [promptRequired, receptionists]);

  const handleConfirm = () => {
    const chosen = receptionists.find((r) => r.id === selectedId);
    if (!chosen) return;
    try {
      window.localStorage.setItem(LAST_USED_KEY, chosen.id);
    } catch {
      // Ignore persistence failures.
    }
    settle({
      ok: true,
      receptionistId: chosen.id,
      receptionistName: chosen.name,
    });
  };

  const handleCancel = () => {
    settle({ ok: false, receptionistId: null, receptionistName: null });
  };

  return (
    <ReceptionistContext.Provider
      value={{ promptRequired, receptionists, requireReceptionist }}
    >
      {children}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleCancel();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={selectedId}
            onValueChange={setSelectedId}
            className="gap-2 py-1 max-h-72 overflow-y-auto"
          >
            {receptionists.map((r) => (
              <Label
                key={r.id}
                htmlFor={`recep-${r.id}`}
                className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem value={r.id} id={`recep-${r.id}`} />
                <UserCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{r.name}</span>
              </Label>
            ))}
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {t("cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedId}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ReceptionistContext.Provider>
  );
}

export function useReceptionist(): Ctx {
  const ctx = React.useContext(ReceptionistContext);
  if (!ctx) {
    // Fail open: outside the provider (shouldn't happen in the dashboard),
    // never block the action.
    return {
      promptRequired: false,
      receptionists: [],
      requireReceptionist: async () => NO_PROMPT,
    };
  }
  return ctx;
}
