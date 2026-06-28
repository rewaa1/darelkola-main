"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Settings,
  Stethoscope,
  Pill,
} from "lucide-react";

import { getDirection, type Locale } from "@/i18n/config";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

// `key` maps to the "nav" translation namespace; labels are resolved at render.
const navItems = [
  {
    key: "dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    key: "queue",
    url: "/queue",
    icon: ClipboardList,
  },
  {
    key: "patients",
    url: "/patients",
    icon: Users,
  },
  {
    key: "appointments",
    url: "/appointments",
    icon: Calendar,
  },
  {
    key: "medications",
    url: "/medications",
    icon: Pill,
  },
] as const;

const secondaryNav = [
  {
    key: "settings",
    url: "/settings",
    icon: Settings,
  },
] as const;

interface DarelkolaSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function DarelkolaSidebar({ user, ...props }: DarelkolaSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  // In RTL the sidebar must dock to the right; the shadcn Sidebar uses a
  // physical `side` prop that doesn't follow `dir`, so we set it explicitly.
  const side = getDirection(locale) === "rtl" ? "right" : "left";

  return (
    <Sidebar collapsible="icon" side={side} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Stethoscope className="!size-5 text-primary" />
                <span className="text-base font-semibold">Darelkola</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>{t("main")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={t(item.key)}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Navigation */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={t(item.key)}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            name: user.name,
            email: user.email,
            avatar: "",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
