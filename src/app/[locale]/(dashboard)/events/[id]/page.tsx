import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Car, FileText, MapPin, Pencil, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getEventById } from "@/actions/events";
import { listEventComments } from "@/actions/event-comments";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { formatCHF, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EventStatusBadge } from "@/components/events/event-status-badge";
import { EventStatusActions } from "@/components/events/event-status-actions";
import { EventComments } from "@/components/events/event-comments";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { id } = await params;

  const [t, result, commentsResult, currentUser] = await Promise.all([
    getTranslations("events"),
    getEventById(id),
    listEventComments(id),
    getCurrentUser(),
  ]);

  if (!result.success || !currentUser) {
    notFound();
  }

  const event = result.data;
  const comments = commentsResult.success ? commentsResult.data : [];
  const canUpdate = hasPermission(currentUser.role, "events", "update");
  const canDelete = hasPermission(currentUser.role, "events", "delete");
  const canComment = currentUser.role !== "viewer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {event.eventNumber}
            </h1>
            <EventStatusBadge status={event.status} />
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${event.fonction.color ?? "#94A3B8"}1A`,
                color: event.fonction.color ?? "#475569",
              }}
            >
              <span
                aria-hidden
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: event.fonction.color ?? "#94A3B8" }}
              />
              {event.fonction.name}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{event.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {canUpdate &&
            event.status !== "completed" &&
            event.status !== "cancelled" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/events/${event.id}/edit`}>
                  <Pencil className="mr-2 size-4" />
                  {t("detail.edit")}
                </Link>
              </Button>
            )}
          <EventStatusActions
            eventId={event.id}
            status={event.status}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info card */}
        <div className="space-y-3 rounded-lg border p-4 text-sm">
          <h2 className="font-semibold text-foreground">{t("detail.info")}</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-muted-foreground">{t("detail.client")}</dt>
              <dd className="font-medium">
                <Link
                  href={`/clients/${event.client.id}`}
                  className="text-primary hover:underline"
                >
                  {event.client.firstName} {event.client.lastName}
                </Link>
                {event.client.companyName && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {event.client.companyName}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("detail.period")}</dt>
              <dd className="font-medium">
                {formatDateTime(event.startDate)} →{" "}
                {formatDateTime(event.endDate)}
              </dd>
            </div>
            {(event.location || event.destination) && (
              <div>
                <dt className="text-muted-foreground">
                  <MapPin className="mr-1 inline size-3.5" />
                  {t("detail.locations")}
                </dt>
                <dd className="font-medium">
                  {event.location ?? "—"}
                  {event.destination && <> → {event.destination}</>}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">
                {t("detail.agreedAmount")}
              </dt>
              <dd className="font-medium">
                {event.agreedAmount
                  ? formatCHF(parseFloat(event.agreedAmount))
                  : "—"}
              </dd>
            </div>
            {event.description && (
              <div>
                <dt className="text-muted-foreground">
                  {t("detail.description")}
                </dt>
                <dd className="whitespace-pre-wrap">{event.description}</dd>
              </div>
            )}
            {event.notes && (
              <div>
                <dt className="text-muted-foreground">{t("detail.notes")}</dt>
                <dd className="whitespace-pre-wrap">{event.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Vehicles card */}
        <div className="space-y-3 rounded-lg border p-4 text-sm">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Car className="size-4" />
            {t("detail.vehicles")} ({event.vehicles.length})
          </h2>
          {event.vehicles.length === 0 ? (
            <p className="text-muted-foreground">{t("detail.noVehicles")}</p>
          ) : (
            <ul className="space-y-2">
              {event.vehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <Link
                    href={`/vehicles/${vehicle.vehicleId}`}
                    className="text-primary hover:underline"
                  >
                    {vehicle.brand} {vehicle.model}
                  </Link>{" "}
                  <span className="text-muted-foreground">
                    ({vehicle.plateNumber})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Team card */}
        <div className="space-y-3 rounded-lg border p-4 text-sm">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Users className="size-4" />
            {t("detail.team")} ({event.employees.length})
          </h2>
          {event.employees.length === 0 ? (
            <p
              className={
                event.fonction.requiresEmployees
                  ? "text-amber-600"
                  : "text-muted-foreground"
              }
            >
              {event.fonction.requiresEmployees
                ? t("detail.noEmployeesWarning")
                : t("detail.noEmployees")}
            </p>
          ) : (
            <ul className="space-y-2">
              {event.employees.map((employee) => (
                <li key={employee.id} className="flex justify-between gap-2">
                  <span className="font-medium">{employee.name}</span>
                  <span className="text-muted-foreground">
                    {employee.role || "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Linked contracts */}
      {event.contracts.length > 0 && (
        <div className="space-y-3 rounded-lg border p-4 text-sm">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <FileText className="size-4" />
            {t("detail.linkedContracts")}
          </h2>
          <ul className="space-y-1">
            {event.contracts.map((contract) => (
              <li key={contract.id}>
                <Link
                  href={`/contracts/${contract.id}`}
                  className="text-primary hover:underline"
                >
                  {contract.contractNumber}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Comments */}
      <EventComments
        eventId={event.id}
        comments={comments}
        currentUserId={currentUser.id}
        isAdmin={currentUser.role === "admin"}
        canComment={canComment}
      />
    </div>
  );
}
