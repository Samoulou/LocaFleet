"use client";

import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { CommandSearch } from "@/components/layout/command-search";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { UserAvatar } from "@/components/layout/user-avatar";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import type { DisplayUser } from "@/components/layout/nav-config";

type AppTopbarProps = {
  user: DisplayUser;
};

export function AppTopbar({ user }: AppTopbarProps) {
  const t = useTranslations();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
      {/* Mobile hamburger */}
      <MobileSidebar user={user} />

      {/* Search */}
      <div className="flex-1 flex justify-center">
        <CommandSearch />
      </div>

      {/* Right side: locale + notifications + user */}
      <div className="flex items-center gap-1">
        <LocaleSwitcher />

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("topbar.notifications")}
        >
          <Bell className="size-5 text-slate-500" />
        </Button>

        <UserMenu user={user} side="bottom" align="end">
          <button className="rounded-full" aria-label={t("sidebar.profile")}>
            <UserAvatar name={user.name} className="size-8" />
          </button>
        </UserMenu>
      </div>
    </header>
  );
}
