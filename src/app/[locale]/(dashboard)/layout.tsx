import { LogoutButton } from "@/components/auth/logout-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — placeholder for US-1.5 */}
      <aside className="hidden w-[240px] shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="flex h-14 items-center border-b border-slate-200 px-6">
          <span className="text-lg font-bold text-slate-900">LocaFleet</span>
        </div>
        <div className="p-4 text-sm text-slate-400">Navigation — US-1.5</div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <span className="text-sm text-slate-400">Topbar — US-1.5</span>
          <LogoutButton />
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}
