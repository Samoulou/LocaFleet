"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronsLeft, ChevronsRight, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import {
  NAV_SECTIONS,
  isItemVisible,
  type DisplayUser,
} from "@/components/layout/nav-config";
import { UserAvatar } from "@/components/layout/user-avatar";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

type AppSidebarProps = {
  user: DisplayUser;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations();

  const strippedPath = pathname.replace(`/${locale}`, "") || "/";

  function isActive(href: string): boolean {
    return strippedPath.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-background transition-[width] duration-200 ease-in-out shrink-0",
        collapsed ? "w-16" : "w-[240px]"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b border-border px-4 gap-2">
        <Car className="size-6 shrink-0 text-primary" />
        {!collapsed && (
          <span className="text-lg font-bold text-foreground truncate">
            LocaFleet
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {sectionIdx > 0 && <Separator className="my-2" />}
            <div className="flex flex-col gap-1">
              {section.items
                .filter((item) => isItemVisible(item, user.role))
                .map((item) => {
                  const active = !item.disabled && isActive(item.href);
                  const Icon = item.icon;
                  const label = t(`navigation.${item.key}`);

                  if (item.disabled) {
                    const disabledContent = (
                      <span
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium border-l-[3px] border-transparent text-muted-foreground cursor-not-allowed"
                        aria-disabled="true"
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="truncate">{label}</span>
                            <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                              {t("sidebar.comingSoon")}
                            </span>
                          </>
                        )}
                      </span>
                    );

                    if (collapsed) {
                      return (
                        <Tooltip key={item.key} delayDuration={0}>
                          <TooltipTrigger asChild>
                            {disabledContent}
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>
                              {label} — {t("sidebar.comingSoon")}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return <div key={item.key}>{disabledContent}</div>;
                  }

                  const linkContent = (
                      <Link
                      href={`/${locale}${item.href}`}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary border-l-[3px] border-primary"
                          : "text-muted-foreground hover:bg-muted border-l-[3px] border-transparent"
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.key} delayDuration={0}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{label}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={item.key}>{linkContent}</div>;
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-1">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {collapsed ? (
            <ChevronsRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <ChevronsLeft className="w-5 h-5 shrink-0" />
              <span>{t("sidebar.collapse")}</span>
            </>
          )}
        </button>
      </div>

      {/* User section */}
      <div className="border-t border-border p-2">
        <UserMenu user={user} side="top" align="start">
          <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-muted transition-colors text-left">
            <UserAvatar name={user.name} className="size-8 shrink-0" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate capitalize">
                  {t(`rbac.roles.${user.role}`)}
                </p>
              </div>
            )}
          </button>
        </UserMenu>
      </div>
    </aside>
  );
}
