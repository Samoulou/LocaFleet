import { getTranslations } from "next-intl/server";
import {
  getFonctionsForEventForm,
  getVehiclesForEventForm,
  getEmployeesForEventForm,
} from "@/actions/events";
import { EventForm } from "@/components/events/event-form";

export default async function NewEventPage() {
  const [t, fonctionsResult, vehiclesResult, employeesResult] =
    await Promise.all([
      getTranslations("events"),
      getFonctionsForEventForm(),
      getVehiclesForEventForm(),
      getEmployeesForEventForm(),
    ]);

  if (
    !fonctionsResult.success ||
    !vehiclesResult.success ||
    !employeesResult.success
  ) {
    const error = [fonctionsResult, vehiclesResult, employeesResult].find(
      (r) => !r.success
    );
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          {error && !error.success ? error.error : "Une erreur est survenue"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("form.createPageTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("form.createPageSubtitle")}
        </p>
      </div>

      <EventForm
        fonctions={fonctionsResult.data}
        vehicles={vehiclesResult.data}
        employees={employeesResult.data}
      />
    </div>
  );
}
