import { Plus, Car } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { VehicleFilters } from "@/components/vehicles/vehicle-filters";
import { VehiclesDataTable } from "@/components/vehicles/vehicles-data-table";
import { listVehicles, listVehicleCategories } from "@/actions/vehicles";

type VehiclesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VehiclesPage({
  searchParams,
}: VehiclesPageProps) {
  const params = await searchParams;

  // Normalize search params for the action
  const input = {
    page: params.page,
    pageSize: params.pageSize,
    status: params.status,
    category: params.category,
    search: params.search,
  };

  const [vehiclesResult, categoriesResult] = await Promise.all([
    listVehicles(input),
    listVehicleCategories(),
  ]);

  const categories = categoriesResult.success ? categoriesResult.data : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Véhicules</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gérez votre flotte de véhicules
          </p>
        </div>
        <Button asChild>
          <Link href="/vehicles/new">
            <Plus className="mr-2 size-4" />
            Nouveau véhicule
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <VehicleFilters categories={categories} />

      {/* Content */}
      {!vehiclesResult.success ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{vehiclesResult.error}</p>
        </div>
      ) : vehiclesResult.data.totalCount === 0 &&
        !params.search &&
        !params.status &&
        !params.category ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
            <Car className="size-6 text-slate-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-slate-900">
            Aucun véhicule
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Ajoutez votre premier véhicule pour commencer
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/vehicles/new">
              <Plus className="mr-2 size-4" />
              Ajouter votre premier véhicule
            </Link>
          </Button>
        </div>
      ) : (
        <VehiclesDataTable data={vehiclesResult.data} />
      )}
    </div>
  );
}
