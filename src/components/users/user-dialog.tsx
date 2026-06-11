"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createUser, updateUserProfile, updateUserRole } from "@/actions/users";
import type { UserListItem } from "@/actions/users";
import {
  createUserSchema,
  updateUserProfileSchema,
} from "@/lib/validations/users";
import type { UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ROLES: UserRole[] = ["admin", "agent", "viewer", "employee"];
const EMPLOYMENT_TYPES = ["salaried", "hourly"] as const;
// Radix Select forbids empty-string item values; sentinel for "no type"
const NO_TYPE = "none";

type UserDialogProps = {
  user?: UserListItem | null;
  currentUserId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function UserDialog({
  user,
  currentUserId,
  open,
  onOpenChange,
}: UserDialogProps) {
  const t = useTranslations("settings.users.form");
  const tTypes = useTranslations("settings.users.employmentTypes");
  const tRoles = useTranslations("rbac.roles");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const isEdit = !!user;
  const isSelf = isEdit && user.id === currentUserId;

  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [role, setRole] = useState<UserRole>(user?.role ?? "employee");
  const [employmentType, setEmploymentType] = useState<string>(
    user?.employmentType ?? NO_TYPE
  );

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled
    ? (v: boolean) => onOpenChange?.(v)
    : setInternalOpen;

  function resetForm() {
    setErrors({});
    setGeneralError(null);
    setLoading(false);
  }

  // Sync select state when the dialog opens for a given user
  function handleOpenChange(v: boolean) {
    setDialogOpen(v);
    if (v) {
      setRole(user?.role ?? "employee");
      setEmploymentType(user?.employmentType ?? NO_TYPE);
    } else {
      resetForm();
    }
  }

  function collectFieldErrors(
    issues: { path: PropertyKey[]; message: string }[]
  ) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of issues) {
      const field = String(issue.path[0]);
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return fieldErrors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const formData = new FormData(e.currentTarget);
    const common = {
      name: (formData.get("name") as string) ?? "",
      phone: (formData.get("phone") as string) ?? "",
      hourlyRate: (formData.get("hourlyRate") as string) ?? "",
      employmentType: employmentType === NO_TYPE ? "" : employmentType,
    };

    setLoading(true);
    try {
      if (isEdit) {
        const data = { ...common, userId: user.id };
        const parsed = updateUserProfileSchema.safeParse(data);
        if (!parsed.success) {
          setErrors(collectFieldErrors(parsed.error.issues));
          return;
        }

        const profileResult = await updateUserProfile(data);
        if (!profileResult.success) {
          setGeneralError(profileResult.error);
          return;
        }

        // Role changes go through the dedicated action (self-change blocked)
        if (role !== user.role) {
          const roleResult = await updateUserRole({ userId: user.id, role });
          if (!roleResult.success) {
            setGeneralError(roleResult.error);
            return;
          }
        }

        toast.success(t("updateSuccess"));
      } else {
        const data = {
          ...common,
          email: (formData.get("email") as string) ?? "",
          password: (formData.get("password") as string) ?? "",
          role,
        };
        const parsed = createUserSchema.safeParse(data);
        if (!parsed.success) {
          setErrors(collectFieldErrors(parsed.error.issues));
          return;
        }

        const result = await createUser(data);
        if (!result.success) {
          setGeneralError(result.error);
          return;
        }

        toast.success(t("createSuccess"));
      }

      setDialogOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const trigger = !isControlled ? (
    <DialogTrigger asChild>
      <Button>
        <Plus className="mr-2 size-4" />
        {t("createTitle")}
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="user-name">{t("name")} *</Label>
            <Input
              id="user-name"
              name="name"
              defaultValue={user?.name ?? ""}
              placeholder={t("namePlaceholder")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email + password (create only) */}
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="user-email">{t("email")} *</Label>
                <Input
                  id="user-email"
                  name="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">{t("password")} *</Label>
                <Input
                  id="user-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                />
                <p className="text-xs text-muted-foreground">
                  {t("passwordHint")}
                </p>
                {errors.password && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="user-role">{t("role")}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              disabled={isSelf}
            >
              <SelectTrigger id="user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {tRoles(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">
                {t("selfRoleHint")}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="user-phone">{t("phone")}</Label>
            <Input
              id="user-phone"
              name="phone"
              type="tel"
              defaultValue={user?.phone ?? ""}
              placeholder={t("phonePlaceholder")}
            />
            {errors.phone && (
              <p className="text-sm text-destructive" role="alert">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Hourly rate + employment type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-hourlyRate">{t("hourlyRate")}</Label>
              <Input
                id="user-hourlyRate"
                name="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                defaultValue={user?.hourlyRate ?? ""}
                placeholder={t("hourlyRatePlaceholder")}
              />
              {errors.hourlyRate && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.hourlyRate}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-employmentType">{t("employmentType")}</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger id="user-employmentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TYPE}>{tTypes("none")}</SelectItem>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tTypes(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* General Error */}
          {generalError && (
            <p className="text-sm text-destructive" role="alert">
              {generalError}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {isEdit ? t("updating") : t("creating")}
                </>
              ) : isEdit ? (
                t("updateButton")
              ) : (
                t("createButton")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
