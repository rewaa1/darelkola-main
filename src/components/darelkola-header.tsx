"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";

// Maps the first path segment to a translation key under the "nav" namespace.
const routeKeys: Record<string, string> = {
  "/": "dashboard",
  "/queue": "queue",
  "/patients": "patients",
  "/appointments": "appointments",
  "/medications": "medications",
  "/settings": "settings",
};

export function DarelkolaHeader() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tHeader = useTranslations("header");

  // Match the most specific known route prefix (so nested routes still resolve).
  const matchedKey =
    routeKeys[pathname] ??
    routeKeys[
      Object.keys(routeKeys).find(
        (route) => route !== "/" && pathname.startsWith(route),
      ) ?? "/"
    ];

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ms-1" />
      <Separator orientation="vertical" className="me-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink href="/">{tHeader("clinicName")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbPage>{tNav(matchedKey)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ms-auto flex items-center gap-1">
        <LanguageSwitcher />
      </div>
    </header>
  );
}
