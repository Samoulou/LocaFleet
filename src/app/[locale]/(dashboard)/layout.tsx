import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const displayUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar user={displayUser} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <AppTopbar user={displayUser} />

          <main className="flex-1 overflow-auto bg-slate-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
