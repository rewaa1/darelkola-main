"use client";

import { useTranslations } from "next-intl";
import { Stethoscope } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/auth/LogoutButton";

// A deliberately minimal shell — no sidebar, no navigation. The assistant has
// exactly one screen, so the chrome is just an identity bar and a way out.
export function AssistantShell({
  user,
  children,
}: {
  user: { name: string };
  children: React.ReactNode;
}) {
  const t = useTranslations("assistant");
  const tHeader = useTranslations("header");

  return (
    <div className="min-h-svh bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Stethoscope className="h-5 w-5 text-indigo-600 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">
            {tHeader("clinicName")}
          </p>
          <p className="text-xs text-muted-foreground leading-tight truncate">
            {t("title")} · {user.name}
          </p>
        </div>
        <div className="ms-auto flex items-center gap-1">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</main>
    </div>
  );
}
