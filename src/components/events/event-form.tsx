"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  createEvent,
  updateEvent,
  type EventConflicts,
  type EventDetail,
  type EventMutationResult,
  type FonctionSelectItem,
  type VehicleSelectItem,
  type EmployeeSelectItem,
} from "@/actions/events";
import { ClientAutocomplete } from "@/components/contracts/client-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConflictWarningDialog } from "./conflict-warning-dialog";

type EventFormProps = {
  fonctions: FonctionSelectItem[];
  vehicles: VehicleSelectItem[];
  employees: EmployeeSelectItem[];
  /** Present in edit mode */
  event?: EventDetail;
};

function toInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventForm({
  fonctions,
  vehicles,
  employees,
  event,
}: EventFormProps) {
  const t = useTranslations("events.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const isEdit = !!event;

  const [fonctionId, setFonctionId] = useState(event?.fonction.id ?? "");
  const [clientId, setClientId] = useState(event?.client.id ?? "");
  const [title, setTitle] = useState(event?.title ?? "");
  const [startDate, setStartDate] = useState(
    event ? toInputValue(event.startDate) : ""
  );
  const [endDate, setEndDate] = useState(
    event ? toInputValue(event.endDate) : ""
  );
  const [location, setLocation] = useState(event?.location ?? "");
  const [destination, setDestination] = useState(event?.destination ?? "");
  const [agreedAmount, setAgreedAmount] = useState(event?.agreedAmount ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(
    event?.vehicles.map((v) => v.vehicleId) ?? []
  );
  const [selectedEmployees, setSelectedEmployees] = useState<
    Map<string, string>
  >(new Map(event?.employees.map((e) => [e.userId, e.role ?? ""]) ?? []));

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [pendingConflicts, setPendingConflicts] =
    useState<EventConflicts | null>(null);

  const selectedFonction = fonctions.find((f) => f.id === fonctionId);
  const showMissingEmployeesHint =
    !!selectedFonction?.requiresEmployees && selectedEmployees.size === 0;

  const vehicleLabelById = useMemo(() => {
    const map = new Map(
      vehicles.map((v) => [v.id, `${v.brand} ${v.model} (${v.plateNumber})`])
    );
    return (id: string) => map.get(id) ?? id;
  }, [vehicles]);

  const employeeNameById = useMemo(() => {
    const map = new Map(employees.map((e) => [e.id, e.name]));
    return (id: string) => map.get(id) ?? id;
  }, [employees]);

  function toggleVehicle(vehicleId: string, checked: boolean) {
    setSelectedVehicleIds((prev) =>
      checked ? [...prev, vehicleId] : prev.filter((id) => id !== vehicleId)
    );
  }

  function toggleEmployee(userId: string, checked: boolean) {
    setSelectedEmployees((prev) => {
      const next = new Map(prev);
      if (checked) next.set(userId, next.get(userId) ?? "");
      else next.delete(userId);
      return next;
    });
  }

  function setEmployeeRole(userId: string, role: string) {
    setSelectedEmployees((prev) => {
      const next = new Map(prev);
      next.set(userId, role);
      return next;
    });
  }

  function buildPayload(acknowledgeConflicts: boolean) {
    return {
      ...(isEdit ? { id: event.id } : {}),
      fonctionId,
      clientId,
      title,
      startDate,
      endDate,
      location,
      destination,
      agreedAmount,
      description,
      notes,
      vehicleIds: selectedVehicleIds,
      employees: Array.from(selectedEmployees.entries()).map(
        ([userId, role]) => ({ userId, role })
      ),
      acknowledgeConflicts,
    };
  }

  async function submit(acknowledgeConflicts: boolean) {
    setGeneralError(null);
    setLoading(true);
    try {
      const payload = buildPayload(acknowledgeConflicts);
      const result: EventMutationResult = isEdit
        ? await updateEvent(payload)
        : await createEvent(payload);

      if (!result.success) {
        if (result.conflicts) {
          // Warn-not-forbid: show the conflicts, let the user confirm
          setPendingConflicts(result.conflicts);
          return;
        }
        setPendingConflicts(null);
        setGeneralError(result.error);
        return;
      }

      setPendingConflicts(null);
      toast.success(isEdit ? t("updateSuccess") : t("createSuccess"));
      router.push(`/events/${result.data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submit(false);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column — main info */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="event-fonction">{t("fonction")} *</Label>
              <Select value={fonctionId} onValueChange={setFonctionId}>
                <SelectTrigger id="event-fonction">
                  <SelectValue placeholder={t("fonctionPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {fonctions.map((fonction) => (
                    <SelectItem key={fonction.id} value={fonction.id}>
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-block size-2.5 rounded-full"
                          style={{
                            backgroundColor: fonction.color ?? "#94A3B8",
                          }}
                        />
                        {fonction.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("client")} *</Label>
              {isEdit && (
                <p className="text-sm text-muted-foreground">
                  {t("currentClient")} : {event.client.firstName}{" "}
                  {event.client.lastName}
                </p>
              )}
              <ClientAutocomplete
                value={clientId}
                onChange={(id) => setClientId(id)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-title">{t("title")} *</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start">{t("startDate")} *</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">{t("endDate")} *</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-location">{t("location")}</Label>
                <Input
                  id="event-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t("locationPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-destination">{t("destination")}</Label>
                <Input
                  id="event-destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={t("destinationPlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-amount">{t("agreedAmount")}</Label>
              <Input
                id="event-amount"
                type="number"
                step="0.01"
                min="0"
                value={agreedAmount}
                onChange={(e) => setAgreedAmount(e.target.value)}
                placeholder={t("agreedAmountPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">{t("description")}</Label>
              <Textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-notes">{t("notes")}</Label>
              <Textarea
                id="event-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Right column — assignments */}
          <div className="space-y-6">
            <div className="space-y-3 rounded-lg border p-4">
              <Label>{t("vehicles")}</Label>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {vehicles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("noVehicles")}
                  </p>
                )}
                {vehicles.map((vehicle) => (
                  <label
                    key={vehicle.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedVehicleIds.includes(vehicle.id)}
                      onCheckedChange={(checked) =>
                        toggleVehicle(vehicle.id, checked === true)
                      }
                    />
                    {vehicle.brand} {vehicle.model}
                    <span className="text-muted-foreground">
                      ({vehicle.plateNumber})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <Label>{t("employees")}</Label>
              {showMissingEmployeesHint && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  <AlertTriangle className="size-4 shrink-0" />
                  {t("requiresEmployeesWarning")}
                </div>
              )}
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {employees.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("noEmployees")}
                  </p>
                )}
                {employees.map((employee) => {
                  const selected = selectedEmployees.has(employee.id);
                  return (
                    <div key={employee.id} className="flex items-center gap-2">
                      <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) =>
                            toggleEmployee(employee.id, checked === true)
                          }
                        />
                        {employee.name}
                      </label>
                      {selected && (
                        <Input
                          value={selectedEmployees.get(employee.id) ?? ""}
                          onChange={(e) =>
                            setEmployeeRole(employee.id, e.target.value)
                          }
                          placeholder={t("rolePlaceholder")}
                          className="h-8 w-36 text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {generalError && (
          <p className="text-sm text-destructive" role="alert">
            {generalError}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && !pendingConflicts ? (
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

      <ConflictWarningDialog
        open={!!pendingConflicts}
        conflicts={pendingConflicts}
        loading={loading}
        vehicleLabelById={vehicleLabelById}
        employeeNameById={employeeNameById}
        onConfirm={() => submit(true)}
        onCancel={() => setPendingConflicts(null)}
      />
    </>
  );
}
