"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NAV_SECTIONS,
  isItemVisible,
  type DisplayUser,
} from "@/components/layout/nav-config";
import { UserAvatar } from "@/components/layout/user-avatar";
import { UserMenu } from "@/components/layout/user-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type MobileSidebarProps = {
  user: DisplayUser;
};

export function MobileSidebar({ user }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations();

  const strippedPath = pathname.replace(`/${locale}`, "") || "/";

  function isActive(href: string): boolean {
    return strippedPath.startsWith(href);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t("sidebar.openMenu")}
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        {/* Header */}
        <div className="flex h-14 items-center border-b border-slate-200 px-4 gap-2">
          <Car className="size-6 text-blue-600" />
          <span className="text-lg font-bold text-slate-900">LocaFleet</span>
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
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    const label = t(`navigation.${item.key}`);

                    return (
                      <Link
                        key={item.key}
                        href={`/${locale}${item.href}`}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-blue-50 text-blue-600 border-l-[3px] border-blue-600"
                            : "text-slate-600 hover:bg-slate-50 border-l-[3px] border-transparent"
                        )}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="truncate">{label}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-200 p-2 mt-auto">
          <UserMenu user={user} side="top" align="start">
            <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-50 transition-colors text-left">
              <UserAvatar name={user.name} className="size-8" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {t(`rbac.roles.${user.role}`)}
                </p>
              </div>
            </button>
          </UserMenu>
        </div>
      </SheetContent>
    </Sheet>
  );
}
