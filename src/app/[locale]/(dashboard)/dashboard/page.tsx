import { getTranslations } from "next-intl/server";
import {
  getDashboardStats,
  getActiveRentals,
  getReturnsDue,
  getMaintenanceAlerts,
} from "@/actions/dashboard";
import { DashboardStatsGrid } from "@/components/dashboard/dashboard-stats-grid";
import { ActiveRentalsList } from "@/components/dashboard/active-rentals-list";
import { ReturnsDueList } from "@/components/dashboard/returns-due-list";
import { MaintenanceAlertsList } from "@/components/dashboard/maintenance-alerts-list";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  const [statsResult, rentalsResult, returnsResult, maintenanceResult] =
    await Promise.all([
      getDashboardStats(),
      getActiveRentals(),
      getReturnsDue(),
      getMaintenanceAlerts(),
    ]);

  const stats = statsResult.success ? statsResult.data : null;
  const rentals = rentalsResult.success ? rentalsResult.data : [];
  const returns = returnsResult.success ? returnsResult.data : [];
  const maintenanceAlerts = maintenanceResult.success
    ? maintenanceResult.data
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Stats Grid */}
      {stats && <DashboardStatsGrid stats={stats} />}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active Rentals */}
        <div className="lg:col-span-2">
          <ActiveRentalsList rentals={rentals} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <QuickActions />
          <ReturnsDueList returns={returns} />
        </div>
      </div>

      {/* Maintenance Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MaintenanceAlertsList alerts={maintenanceAlerts} />
      </div>
    </div>
  );
}
