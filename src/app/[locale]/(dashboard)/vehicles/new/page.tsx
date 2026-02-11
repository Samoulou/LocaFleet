import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { listVehicleCategories } from "@/actions/vehicles";

export default async function NewVehiclePage() {
  const [t, categoriesResult] = await Promise.all([
    getTranslations("vehicles.form"),
    listVehicleCategories(),
  ]);

  const categories = categoriesResult.success ? categoriesResult.data : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/vehicles">
            <ArrowLeft className="mr-1 size-4" />
            {(await getTranslations("navigation"))("vehicles")}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">
          {t("createTitle")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("createSubtitle")}</p>
      </div>

      {/* Form */}
      <div className="max-w-3xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <VehicleForm categories={categories} />
        </div>
      </div>
    </div>
  );
}
