import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { listUsers } from "@/actions/users";
import { getCurrentUser } from "@/lib/auth";
import { UsersTable } from "@/components/users/users-table";
import { UserDialog } from "@/components/users/user-dialog";

export default async function UsersSettingsPage() {
  const [t, result, currentUser] = await Promise.all([
    getTranslations("settings.users"),
    listUsers(),
    getCurrentUser(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <UserDialog />
      </div>

      {/* Content */}
      {!result.success ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{result.error}</p>
        </div>
      ) : result.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-foreground">
            {t("emptyState.title")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("emptyState.description")}
          </p>
          <div className="mt-4">
            <UserDialog />
          </div>
        </div>
      ) : (
        <UsersTable users={result.data} currentUserId={currentUser?.id ?? ""} />
      )}
    </div>
  );
}
