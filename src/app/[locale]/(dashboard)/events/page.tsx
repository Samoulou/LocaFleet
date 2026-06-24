import { CalendarCheck, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listEvents } from "@/actions/events";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { EventsTable } from "@/components/events/events-table";
import { Button } from "@/components/ui/button";

type EventsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;

  const [t, result, currentUser] = await Promise.all([
    getTranslations("events"),
    listEvents({
      page: params.page,
      status: params.status,
      search: params.search,
    }),
    getCurrentUser(),
  ]);

  const canCreate =
    !!currentUser && hasPermission(currentUser.role, "events", "create");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("list.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("list.subtitle")}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/events/new">
              <Plus className="mr-2 size-4" />
              {t("list.newEvent")}
            </Link>
          </Button>
        )}
      </div>

      {/* Content */}
      {!result.success ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{result.error}</p>
        </div>
      ) : result.data.total === 0 && !params.status && !params.search ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <CalendarCheck className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-foreground">
            {t("list.empty")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("list.emptyDescription")}
          </p>
          {canCreate && (
            <Button asChild className="mt-4">
              <Link href="/events/new">
                <Plus className="mr-2 size-4" />
                {t("list.newEvent")}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <EventsTable data={result.data} />
      )}
    </div>
  );
}
