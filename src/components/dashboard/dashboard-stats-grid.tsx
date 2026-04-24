"use client";

import { useTranslations } from "next-intl";
import {
  Car,
  Wrench,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Gauge,
  Users,
  FileText,
  Receipt,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCHF } from "@/lib/utils";
import type { DashboardStats } from "@/actions/dashboard";

type DashboardStatsGridProps = {
  stats: DashboardStats;
};

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  const t = useTranslations("dashboard.stats");

  return (
    <div className="space-y-4">
      {/* Primary stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={t("activeRentals")}
          value={stats.activeRentals}
          icon={Car}
          href="/contracts"
        />
        <StatCard
          label={t("returnsDueToday")}
          value={stats.returnsDueToday}
          icon={Clock}
          href="/contracts"
          variant={stats.returnsDueToday > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("overdueReturns")}
          value={stats.overdueReturns}
          icon={AlertTriangle}
          href="/contracts"
          variant={stats.overdueReturns > 0 ? "danger" : "default"}
        />
        <StatCard
          label={t("inMaintenance")}
          value={stats.vehiclesInMaintenance}
          icon={Wrench}
          href="/vehicles"
          variant={stats.vehiclesInMaintenance > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("available")}
          value={stats.availableVehicles}
          icon={CheckCircle2}
          href="/vehicles"
          variant="success"
        />
        <StatCard
          label={t("monthlyRevenue")}
          value={formatCHF(stats.monthlyRevenue)}
          icon={TrendingUp}
          href="/invoices"
        />
      </div>

      {/* Intelligence row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Taux d'utilisation"
          value={`${stats.utilizationRate}%`}
          icon={Gauge}
          href="/vehicles"
          variant={
            stats.utilizationRate >= 80
              ? "success"
              : stats.utilizationRate >= 50
                ? "warning"
                : "default"
          }
        />
        <StatCard
          label="Revenu moyen / véhicule"
          value={formatCHF(stats.avgRevenuePerVehicle)}
          icon={TrendingUp}
          href="/invoices"
        />
        <StatCard
          label="Durée moyenne location"
          value={`${stats.avgContractDuration} j`}
          icon={Clock}
          href="/contracts"
        />
        <StatCard
          label="Clients récurrents"
          value={stats.recurringClients}
          icon={Users}
          href="/clients"
        />
        <StatCard
          label="Montant impayé"
          value={formatCHF(stats.totalUnpaid)}
          icon={Receipt}
          href="/invoices"
          variant={stats.totalUnpaid > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Valeur moyenne contrat"
          value={formatCHF(stats.avgContractValue)}
          icon={FileText}
          href="/contracts"
        />
      </div>
    </div>
  );
}
