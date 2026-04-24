"use client";

import {
  useState,
  useMemo,
  useEffect,
  useTransition,
  useRef,
  useCallback,
} from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarIcon,
  FileText,
  CheckCircle2,
  Wrench,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  formatDate,
  cn,
  toDateInputValue,
  parseDateInputValue,
} from "@/lib/utils";
import { getPlanningData } from "@/actions/planning";
import { NewContractSheet } from "@/components/contracts/new-contract-sheet";
import { CreateMaintenanceDialog } from "@/components/maintenance/create-maintenance-dialog";
import { CloseMaintenanceDialog } from "@/components/maintenance/close-maintenance-dialog";
import { CancelMaintenanceDialog } from "@/components/maintenance/cancel-maintenance-dialog";
import type { PlanningData, PlanningContract, PlanningMaintenance } from "@/actions/planning";

type PlanningCalendarProps = {
  initialData: PlanningData;
};

const INITIAL_DAYS = 60; // ±30 from today
const EXTEND_DAYS = 30;
const VEHICLE_COL_WIDTH = 200; // px
const MIN_DAY_COL_WIDTH = 72; // px
const LANE_HEIGHT = 24; // px
const LANE_GAP = 2; // px
const BAR_HEIGHT = LANE_HEIGHT - LANE_GAP; // px

// ============================================================================
// Helpers
// ============================================================================

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function generateDayRange(center: Date, halfWindow: number): Date[] {
  const days: Date[] = [];
  for (let i = -halfWindow; i < halfWindow; i++) {
    const d = new Date(center);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

/** Get the day index (0-N) within the visible window for a contract's overlap */
function getContractVisibleRange(
  contract: PlanningContract,
  viewStart: Date,
  viewEnd: Date
): { startIdx: number; endIdx: number } | null {
  const cStart = new Date(contract.startDate);
  cStart.setHours(0, 0, 0, 0);
  const cEnd = new Date(contract.endDate);
  cEnd.setHours(23, 59, 59, 999);

  const vStart = new Date(viewStart);
  vStart.setHours(0, 0, 0, 0);
  const vEnd = new Date(viewEnd);
  vEnd.setHours(23, 59, 59, 999);

  if (cEnd < vStart || cStart > vEnd) return null;

  const msPerDay = 24 * 60 * 60 * 1000;
  const startIdx = Math.max(
    0,
    Math.floor((cStart.getTime() - vStart.getTime()) / msPerDay)
  );
  const endIdx = Math.min(
    Math.floor((vEnd.getTime() - vStart.getTime()) / msPerDay),
    Math.floor((cEnd.getTime() - vStart.getTime()) / msPerDay)
  );

  if (startIdx > endIdx) return null;
  return { startIdx, endIdx };
}

/** Get the day index (0-N) within the visible window for a maintenance record's overlap */
function getMaintenanceVisibleRange(
  maintenance: PlanningMaintenance,
  viewStart: Date,
  viewEnd: Date
): { startIdx: number; endIdx: number } | null {
  const mStart = new Date(maintenance.startDate);
  mStart.setHours(0, 0, 0, 0);
  const mEnd = maintenance.endDate
    ? new Date(maintenance.endDate)
    : null;
  if (mEnd) mEnd.setHours(23, 59, 59, 999);

  const vStart = new Date(viewStart);
  vStart.setHours(0, 0, 0, 0);
  const vEnd = new Date(viewEnd);
  vEnd.setHours(23, 59, 59, 999);

  // If maintenance has ended before view starts, it's not visible
  if (mEnd && mEnd < vStart) return null;
  // If maintenance starts after view ends, it's not visible
  if (mStart > vEnd) return null;

  const msPerDay = 24 * 60 * 60 * 1000;
  const startIdx = Math.max(
    0,
    Math.floor((mStart.getTime() - vStart.getTime()) / msPerDay)
  );
  const endIdx = mEnd
    ? Math.min(
        Math.floor((vEnd.getTime() - vStart.getTime()) / msPerDay),
        Math.floor((mEnd.getTime() - vStart.getTime()) / msPerDay)
      )
    : Math.floor((vEnd.getTime() - vStart.getTime()) / msPerDay);

  if (startIdx > endIdx) return null;
  return { startIdx, endIdx };
}

/** Greedy lane assignment for overlapping contracts */
function assignLanes(
  ranges: Array<{ id: string; startIdx: number; endIdx: number }>
): Map<string, number> {
  const lanes: Array<{ id: string; startIdx: number; endIdx: number }>[] = [];
  const assignments = new Map<string, number>();

  const sorted = [...ranges].sort((a, b) =>
    a.startIdx !== b.startIdx
      ? a.startIdx - b.startIdx
      : a.endIdx - b.endIdx
  );

  for (const contract of sorted) {
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      const overlaps = lanes[i].some(
        (c) =>
          contract.startIdx <= c.endIdx && contract.endIdx >= c.startIdx
      );
      if (!overlaps) {
        lanes[i].push(contract);
        assignments.set(contract.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([contract]);
      assignments.set(contract.id, lanes.length - 1);
    }
  }

  return assignments;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-400",
  approved: "bg-blue-500",
  pending_cg: "bg-purple-500",
  active: "bg-green-500",
  completed: "bg-slate-400",
  cancelled: "bg-red-400",
};

// ============================================================================
// Component
// ============================================================================

export function PlanningCalendar({ initialData }: PlanningCalendarProps) {
  const t = useTranslations("planning");
  const tMaintTypes = useTranslations("maintenance.create.types");
  const [isPending, startTransition] = useTransition();

  // Build initial days from initialData range
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [days, setDays] = useState<Date[]>(() => {
    const start = parseDateInputValue(initialData.startDate);
    const end = parseDateInputValue(initialData.endDate);
    const result: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      result.push(new Date(d));
    }
    return result;
  });

  const [data, setData] = useState<PlanningData>(initialData);

  // Selection state
  const [selection, setSelection] = useState<{
    vehicleId: string;
    startIdx: number;
    endIdx: number;
    isSelecting: boolean;
  } | null>(null);

  // Refs for synchronous access in event handlers (avoid stale closures)
  const isSelectingRef = useRef(false);
  const selectionRef = useRef(selection);
  const daysRef = useRef(days);

  useEffect(() => {
    selectionRef.current = selection;
    isSelectingRef.current = selection?.isSelecting ?? false;
  }, [selection]);

  useEffect(() => {
    daysRef.current = days;
  }, [days]);

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVehicle, setMenuVehicle] = useState<{
    id: string;
    name: string;
    plateNumber: string;
    status: string;
    dailyRate: number;
    categoryName: string | null;
  } | null>(null);

  // Contract sheet state
  const [sheetVehicle, setSheetVehicle] = useState<{
    id: string;
    name: string;
    plateNumber: string;
    status: string;
    dailyRate: number;
    categoryName: string | null;
  } | null>(null);
  const [sheetDates, setSheetDates] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Maintenance dialog state
  const [maintVehicle, setMaintVehicle] = useState<{
    id: string;
  } | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintInitialDate, setMaintInitialDate] = useState<Date | undefined>(
    undefined
  );
  const [maintInitialEndDate, setMaintInitialEndDate] = useState<
    Date | undefined
  >(undefined);

  // Close maintenance dialog state
  const [closeMaintId, setCloseMaintId] = useState<string | null>(null);
  const [closeMaintOpen, setCloseMaintOpen] = useState(false);

  // Cancel maintenance dialog state
  const [cancelMaintId, setCancelMaintId] = useState<string | null>(null);
  const [cancelMaintOpen, setCancelMaintOpen] = useState(false);

  // Maintenance action menu state (when clicking on a maintenance bar)
  const [maintActionMenu, setMaintActionMenu] = useState<{
    maintenanceId: string;
    maintenanceType: string;
  } | null>(null);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const leftSentinelRef = useRef<HTMLDivElement>(null);
  const rightSentinelRef = useRef<HTMLDivElement>(null);
  const extendDirRef = useRef<"left" | "right" | null>(null);

  // --------------------------------------------------------------------------
  // IntersectionObserver for auto-extend
  // --------------------------------------------------------------------------

  const extendLeft = useCallback(() => {
    if (extendDirRef.current || isPending || days.length === 0) return;
    extendDirRef.current = "left";

    const firstDay = days[0];
    const newStart = new Date(firstDay);
    newStart.setDate(newStart.getDate() - EXTEND_DAYS);
    const newEnd = new Date(firstDay);
    newEnd.setDate(newEnd.getDate() - 1);

    startTransition(async () => {
      const result = await getPlanningData(
        toDateInputValue(newStart),
        toDateInputValue(newEnd)
      );
      if (result.success) {
        const newDays: Date[] = [];
        for (let d = new Date(newStart); d <= newEnd; d.setDate(d.getDate() + 1)) {
          newDays.push(new Date(d));
        }

        // Compute pixel offset to preserve scroll position
        const container = scrollRef.current;
        const dayWidth = container
          ? (container.scrollWidth - VEHICLE_COL_WIDTH) / days.length
          : MIN_DAY_COL_WIDTH;
        const scrollOffset = newDays.length * dayWidth;

        const prependCount = newDays.length;

        setDays((prev) => [...newDays, ...prev]);

        // Shift selection indices so they still point to the same days
        setSelection((prev) =>
          prev
            ? {
                ...prev,
                startIdx: prev.startIdx + prependCount,
                endIdx: prev.endIdx + prependCount,
              }
            : null
        );

        setData((prev) => {
          const mergedVehicles = prev.vehicles.map((v) => {
            const newVehicle = result.data.vehicles.find(
              (nv) => nv.id === v.id
            );
            if (!newVehicle) return v;
            return {
              ...v,
              contracts: [...newVehicle.contracts, ...v.contracts],
              maintenance: [...newVehicle.maintenance, ...v.maintenance],
            };
          });
          // Add any vehicles from new data that weren't in prev
          const existingIds = new Set(prev.vehicles.map((v) => v.id));
          const addedVehicles = result.data.vehicles.filter(
            (v) => !existingIds.has(v.id)
          );
          return {
            ...prev,
            vehicles: [...addedVehicles, ...mergedVehicles],
          };
        });

        // Preserve scroll position after React renders
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollLeft += scrollOffset;
          }
          extendDirRef.current = null;
        });
      } else {
        extendDirRef.current = null;
      }
    });
  }, [days, isPending]);

  const extendRight = useCallback(() => {
    if (extendDirRef.current || isPending || days.length === 0) return;
    extendDirRef.current = "right";

    const lastDay = days[days.length - 1];
    const newStart = new Date(lastDay);
    newStart.setDate(newStart.getDate() + 1);
    const newEnd = new Date(lastDay);
    newEnd.setDate(newEnd.getDate() + EXTEND_DAYS);

    startTransition(async () => {
      const result = await getPlanningData(
        toDateInputValue(newStart),
        toDateInputValue(newEnd)
      );
      if (result.success) {
        const newDays: Date[] = [];
        for (let d = new Date(newStart); d <= newEnd; d.setDate(d.getDate() + 1)) {
          newDays.push(new Date(d));
        }

        setDays((prev) => [...prev, ...newDays]);
        setData((prev) => {
          const mergedVehicles = prev.vehicles.map((v) => {
            const newVehicle = result.data.vehicles.find(
              (nv) => nv.id === v.id
            );
            if (!newVehicle) return v;
            return {
              ...v,
              contracts: [...v.contracts, ...newVehicle.contracts],
              maintenance: [...v.maintenance, ...newVehicle.maintenance],
            };
          });
          const existingIds = new Set(prev.vehicles.map((v) => v.id));
          const addedVehicles = result.data.vehicles.filter(
            (v) => !existingIds.has(v.id)
          );
          return {
            ...prev,
            vehicles: [...mergedVehicles, ...addedVehicles],
          };
        });
      }
      extendDirRef.current = null;
    });
  }, [days, isPending]);

  // Stable refs for extend callbacks so IntersectionObserver doesn't recreate
  const extendLeftRef = useRef(extendLeft);
  const extendRightRef = useRef(extendRight);
  useEffect(() => {
    extendLeftRef.current = extendLeft;
    extendRightRef.current = extendRight;
  }, [extendLeft, extendRight]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (entry.target === leftSentinelRef.current) {
              extendLeftRef.current();
            } else if (entry.target === rightSentinelRef.current) {
              extendRightRef.current();
            }
          }
        }
      },
      {
        root: scrollRef.current,
        rootMargin: "200px",
        threshold: 0,
      }
    );

    if (leftSentinelRef.current) observer.observe(leftSentinelRef.current);
    if (rightSentinelRef.current) observer.observe(rightSentinelRef.current);

    return () => observer.disconnect();
  }, []);

  // --------------------------------------------------------------------------
  // Scroll to today on mount
  // --------------------------------------------------------------------------

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || days.length === 0) return;

    const todayIdx = days.findIndex((d) => isSameDay(d, today));
    if (todayIdx === -1) return;

    const dayWidth = (container.scrollWidth - VEHICLE_COL_WIDTH) / days.length;
    const targetScroll =
      todayIdx * dayWidth - container.clientWidth / 2 + dayWidth / 2;

    container.scrollLeft = Math.max(0, targetScroll);
  }, []); // Only on mount

  function scrollToToday() {
    const container = scrollRef.current;
    if (!container || days.length === 0) return;

    const todayIdx = days.findIndex((d) => isSameDay(d, today));
    if (todayIdx === -1) return;

    const dayWidth = (container.scrollWidth - VEHICLE_COL_WIDTH) / days.length;
    const targetScroll =
      todayIdx * dayWidth - container.clientWidth / 2 + dayWidth / 2;

    container.scrollTo({
      left: Math.max(0, targetScroll),
      behavior: "smooth",
    });
  }

  // --------------------------------------------------------------------------
  // Selection handlers
  // --------------------------------------------------------------------------

  function getDayIndexFromMouseX(mouseX: number, rowRect: DOMRect): number {
    const numDays = daysRef.current.length;
    const relativeX = mouseX - rowRect.left - VEHICLE_COL_WIDTH;
    const dayWidth = (rowRect.width - VEHICLE_COL_WIDTH) / numDays;
    const idx = Math.floor(relativeX / dayWidth);
    return Math.max(0, Math.min(numDays - 1, idx));
  }

  function handleMouseDown(
    e: React.MouseEvent,
    vehicleId: string,
    rowRef: HTMLDivElement | null
  ) {
    if (!rowRef) return;
    if ((e.target as HTMLElement).closest("a, button")) return;

    const rect = rowRef.getBoundingClientRect();
    const dayIdx = getDayIndexFromMouseX(e.clientX, rect);

    isSelectingRef.current = true;
    setSelection({
      vehicleId,
      startIdx: dayIdx,
      endIdx: dayIdx,
      isSelecting: true,
    });
    setMenuOpen(false);
  }

  function handleMouseMove(
    e: React.MouseEvent,
    rowRef: HTMLDivElement | null
  ) {
    if (!isSelectingRef.current || !rowRef) return;
    const rect = rowRef.getBoundingClientRect();
    const dayIdx = getDayIndexFromMouseX(e.clientX, rect);
    setSelection((prev) => (prev ? { ...prev, endIdx: dayIdx } : null));
  }

  function handleMouseUp(
    e: React.MouseEvent,
    vehicle: {
      id: string;
      name: string;
      plateNumber: string;
      status: string;
      dailyRate: number;
      categoryName: string | null;
    }
  ) {
    if (!isSelectingRef.current) return;

    isSelectingRef.current = false;
    const currentSelection = selectionRef.current;
    if (!currentSelection) return;

    setSelection({ ...currentSelection, isSelecting: false });
    setMenuVehicle(vehicle);
    setMenuOpen(true);
  }

  function cancelSelection() {
    setSelection(null);
    setMenuOpen(false);
  }

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  function handleCreateContract() {
    if (!selection || !menuVehicle) return;

    const sIdx = Math.min(selection.startIdx, selection.endIdx);
    const eIdx = Math.max(selection.startIdx, selection.endIdx);

    const start = new Date(days[sIdx]);
    start.setHours(10, 0, 0, 0);
    const end = new Date(days[eIdx]);
    end.setHours(10, 0, 0, 0);

    setSheetVehicle(menuVehicle);
    setSheetDates({ start, end });
    setSheetOpen(true);
    setMenuOpen(false);
    setSelection(null);
  }

  function handleCreateMaintenance() {
    if (!selection || !menuVehicle) return;

    const sIdx = Math.min(selection.startIdx, selection.endIdx);
    const eIdx = Math.max(selection.startIdx, selection.endIdx);

    const start = new Date(days[sIdx]);
    const end = new Date(days[eIdx]);

    setMaintVehicle({ id: menuVehicle.id });
    setMaintInitialDate(start);
    setMaintInitialEndDate(end);
    setMaintOpen(true);
    setMenuOpen(false);
    setSelection(null);
  }

  // --------------------------------------------------------------------------
  // Refresh data after create/update
  // --------------------------------------------------------------------------

  function refreshPlanningData() {
    if (days.length === 0) return;
    startTransition(async () => {
      const startStr = toDateInputValue(days[0]);
      const endStr = toDateInputValue(days[days.length - 1]);
      const result = await getPlanningData(startStr, endStr);
      if (result.success) {
        setData(result.data);
      }
    });
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const numDays = days.length;
  const gridTemplate =
    numDays > 0
      ? `minmax(${VEHICLE_COL_WIDTH}px, ${VEHICLE_COL_WIDTH}px) repeat(${numDays}, minmax(${MIN_DAY_COL_WIDTH}px, 1fr))`
      : undefined;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <CalendarIcon className="size-5" />
            {t("title")}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={scrollToToday}>
            {t("today")}
          </Button>
          {isPending && <Skeleton className="h-4 w-16" />}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={scrollRef}
          className="overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="min-w-max relative">
            {/* Sentinel left — full-height strip at content left edge */}
            <div
              ref={leftSentinelRef}
              className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
              aria-hidden="true"
            />

            {/* Header row */}
            {gridTemplate && (
              <div
                className="grid border-b"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <div className="sticky left-0 border-r bg-background p-3 text-sm font-medium text-muted-foreground z-10">
                  {t("vehicle")}
                </div>
                {days.map((day, i) => {
                  const isToday = isSameDay(day, today);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "border-r p-2 text-center text-xs overflow-hidden",
                        isToday && "bg-primary/5",
                        isWeekend && "bg-muted/30"
                      )}
                    >
                      <div
                        className={cn(
                          "font-medium truncate",
                          isToday && "text-primary"
                        )}
                      >
                        {day.toLocaleDateString("fr-FR", {
                          weekday: "short",
                        })}
                      </div>
                      <div
                        className={cn(
                          "truncate",
                          isToday && "font-bold text-primary"
                        )}
                      >
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Vehicle rows */}
            {gridTemplate &&
              data.vehicles.map((vehicle) => (
                <VehicleRow
                  key={vehicle.id}
                  vehicle={vehicle}
                  days={days}
                  today={today}
                  gridTemplate={gridTemplate}
                  selection={
                    selection?.vehicleId === vehicle.id ? selection : null
                  }
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMaintAction={(id, type) => {
                    setMaintActionMenu({ maintenanceId: id, maintenanceType: type });
                  }}
                />
              ))}

            {data.vehicles.length === 0 && !isPending && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarIcon className="mb-2 size-8 opacity-50" />
                <p className="text-sm">{t("noVehicles")}</p>
              </div>
            )}

            {/* Sentinel right — full-height strip at content right edge */}
            <div
              ref={rightSentinelRef}
              className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 border-t p-4">
          <span className="text-xs font-medium text-muted-foreground">
            {t("legend")}:
          </span>
          {[
            { key: "draft", label: t("status.draft") },
            { key: "approved", label: t("status.approved") },
            { key: "pending_cg", label: t("status.pending_cg") },
            { key: "active", label: t("status.active") },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block size-3 rounded-sm",
                  statusColors[item.key]
                )}
              />
              <span className="text-xs text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-green-400 opacity-40" />
            <span className="text-xs text-muted-foreground">Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wrench className="size-3 text-amber-500 opacity-60" />
            <span className="text-xs text-muted-foreground">Maintenance</span>
          </div>
        </div>
      </CardContent>

      {/* Action menu */}
      {menuOpen && menuVehicle && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={cancelSelection}
          >
            <div className="absolute inset-0 bg-black/5" />
          </div>
          <div
            className="fixed z-[60]"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="rounded-lg border bg-background p-2 shadow-lg space-y-1 min-w-[220px]">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground truncate">
                {menuVehicle.name} ({menuVehicle.plateNumber})
              </p>
              <div className="h-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleCreateContract}
              >
                <FileText className="size-4" />
                Créer un contrat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleCreateMaintenance}
              >
                <Wrench className="size-4" />
                Mettre en maintenance
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={cancelSelection}
              >
                <X className="size-4" />
                Annuler
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Contract creation sheet */}
      {sheetVehicle && (
        <NewContractSheet
          vehicleId={sheetVehicle.id}
          vehicleBrand={sheetVehicle.name.split(" ")[0] ?? ""}
          vehicleModel={sheetVehicle.name.split(" ").slice(1).join(" ") ?? ""}
          vehiclePlateNumber={sheetVehicle.plateNumber}
          vehicleStatus={sheetVehicle.status}
          dailyRate={sheetVehicle.dailyRate}
          categoryName={sheetVehicle.categoryName}
          open={sheetOpen}
          onOpenChange={(isOpen) => {
            setSheetOpen(isOpen);
            if (!isOpen) {
              setSheetVehicle(null);
              setSheetDates(null);
            }
          }}
          initialStartDate={sheetDates?.start}
          initialEndDate={sheetDates?.end}
          onSuccess={refreshPlanningData}
        />
      )}

      {/* Maintenance creation dialog */}
      {maintVehicle && (
        <CreateMaintenanceDialog
          vehicleId={maintVehicle.id}
          open={maintOpen}
          onOpenChange={(isOpen) => {
            setMaintOpen(isOpen);
            if (!isOpen) {
              setMaintVehicle(null);
              setMaintInitialDate(undefined);
              setMaintInitialEndDate(undefined);
            }
          }}
          initialStartDate={maintInitialDate}
          initialEndDate={maintInitialEndDate}
          onSuccess={refreshPlanningData}
        />
      )}

      {/* Close maintenance dialog */}
      <CloseMaintenanceDialog
        maintenanceId={closeMaintId ?? ""}
        open={closeMaintOpen}
        onOpenChange={(isOpen) => {
          setCloseMaintOpen(isOpen);
          if (!isOpen) {
            setCloseMaintId(null);
            refreshPlanningData();
          }
        }}
      />

      {/* Cancel maintenance dialog */}
      <CancelMaintenanceDialog
        maintenanceId={cancelMaintId ?? ""}
        open={cancelMaintOpen}
        onOpenChange={(isOpen) => {
          setCancelMaintOpen(isOpen);
          if (!isOpen) {
            setCancelMaintId(null);
            refreshPlanningData();
          }
        }}
      />

      {/* Maintenance action menu */}
      {maintActionMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setMaintActionMenu(null)}
          >
            <div className="absolute inset-0 bg-black/5" />
          </div>
          <div
            className="fixed z-[60]"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="rounded-lg border bg-background p-2 shadow-lg space-y-1 min-w-[220px]">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground truncate">
                {tMaintTypes(maintActionMenu.maintenanceType)}
              </p>
              <div className="h-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setCloseMaintId(maintActionMenu.maintenanceId);
                  setCloseMaintOpen(true);
                  setMaintActionMenu(null);
                }}
              >
                <CheckCircle className="size-4" />
                Clôturer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={() => {
                  setCancelMaintId(maintActionMenu.maintenanceId);
                  setCancelMaintOpen(true);
                  setMaintActionMenu(null);
                }}
              >
                <XCircle className="size-4" />
                Annuler
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => setMaintActionMenu(null)}
              >
                <X className="size-4" />
                Fermer
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ============================================================================
// VehicleRow sub-component
// ============================================================================

type VehicleRowProps = {
  vehicle: PlanningData["vehicles"][number];
  days: Date[];
  today: Date;
  gridTemplate: string;
  selection: { startIdx: number; endIdx: number; isSelecting: boolean } | null;
  onMouseDown: (
    e: React.MouseEvent,
    vehicleId: string,
    rowRef: HTMLDivElement | null
  ) => void;
  onMouseMove: (
    e: React.MouseEvent,
    rowRef: HTMLDivElement | null
  ) => void;
  onMouseUp: (
    e: React.MouseEvent,
    vehicle: {
      id: string;
      name: string;
      plateNumber: string;
      status: string;
      dailyRate: number;
      categoryName: string | null;
    }
  ) => void;
  onMaintAction?: (maintenanceId: string, maintenanceType: string) => void;
};

function VehicleRow({
  vehicle,
  days,
  today,
  gridTemplate,
  selection,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMaintAction,
}: VehicleRowProps) {
  const tMaint = useTranslations("maintenance.create.types");
  const rowRef = useRef<HTMLDivElement>(null);
  const numDays = days.length;

  const viewStart = days[0];
  const viewEnd = days[days.length - 1];
  viewEnd.setHours(23, 59, 59, 999);

  const { contractBars, maintenanceBars, numLanes } = useMemo(() => {
    const visibleContracts: Array<{
      contract: PlanningContract;
      startIdx: number;
      endIdx: number;
    }> = [];

    for (const contract of vehicle.contracts) {
      const range = getContractVisibleRange(contract, viewStart, viewEnd);
      if (range) {
        visibleContracts.push({ contract, ...range });
      }
    }

    const lanes = assignLanes(
      visibleContracts.map((c) => ({
        id: c.contract.id,
        startIdx: c.startIdx,
        endIdx: c.endIdx,
      }))
    );

    const bars = visibleContracts.map((c) => ({
      ...c,
      lane: lanes.get(c.contract.id) ?? 0,
    }));

    const visibleMaintenance: Array<{
      maintenance: PlanningMaintenance;
      startIdx: number;
      endIdx: number;
    }> = [];

    for (const m of vehicle.maintenance) {
      const range = getMaintenanceVisibleRange(m, viewStart, viewEnd);
      if (range) {
        visibleMaintenance.push({ maintenance: m, ...range });
      }
    }

    const maintLanes = assignLanes(
      visibleMaintenance.map((m) => ({
        id: m.maintenance.id,
        startIdx: m.startIdx,
        endIdx: m.endIdx,
      }))
    );

    const maintBars = visibleMaintenance.map((m) => ({
      ...m,
      lane: maintLanes.get(m.maintenance.id) ?? 0,
    }));

    return {
      contractBars: bars,
      maintenanceBars: maintBars,
      numLanes: Math.max(lanes.size, maintLanes.size),
    };
  }, [vehicle.contracts, vehicle.maintenance, viewStart, viewEnd]);

  const rowHeight = Math.max(64, 40 + numLanes * LANE_HEIGHT);

  function isDaySelected(dayIdx: number): boolean {
    if (!selection) return false;
    const s = Math.min(selection.startIdx, selection.endIdx);
    const e = Math.max(selection.startIdx, selection.endIdx);
    return dayIdx >= s && dayIdx <= e;
  }

  return (
    <div
      ref={rowRef}
      className="grid border-b last:border-b-0 select-none"
      style={{ gridTemplateColumns: gridTemplate }}
      onMouseDown={(e) => onMouseDown(e, vehicle.id, rowRef.current)}
      onMouseMove={(e) => onMouseMove(e, rowRef.current)}
      onMouseUp={(e) =>
        onMouseUp(e, {
          id: vehicle.id,
          name: vehicle.name,
          plateNumber: vehicle.plateNumber,
          status: vehicle.status,
          dailyRate: vehicle.dailyRate,
          categoryName: vehicle.categoryName,
        })
      }
    >
      {/* Vehicle info cell */}
      <div className="sticky left-0 flex flex-col justify-center border-r bg-background p-3 z-10 overflow-hidden">
        <Link
          href={`/vehicles/${vehicle.id}`}
          className="text-sm font-medium text-foreground hover:text-primary truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {vehicle.name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-[10px] shrink-0">
            {vehicle.plateNumber}
          </Badge>
          {vehicle.status === "rented" && (
            <span className="inline-block size-2 rounded-full bg-green-500 shrink-0" />
          )}
          {vehicle.status === "maintenance" && (
            <span className="inline-block size-2 rounded-full bg-amber-500 shrink-0" />
          )}
        </div>
      </div>

      {/* Day cells (backgrounds + click targets) */}
      {days.map((day, dayIdx) => {
        const isToday = isSameDay(day, today);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const selected = isDaySelected(dayIdx);
        const hasContract = contractBars.some(
          (b) => dayIdx >= b.startIdx && dayIdx <= b.endIdx
        );
        const hasMaintenance = maintenanceBars.some(
          (b) => dayIdx >= b.startIdx && dayIdx <= b.endIdx
        );

        return (
          <div
            key={dayIdx}
            className={cn(
              "relative border-r overflow-hidden",
              isToday && "bg-primary/5",
              isWeekend && "bg-muted/30",
              selected && "bg-blue-200/40 dark:bg-blue-900/30",
              hasMaintenance && !selected && !hasContract &&
                "bg-amber-50 dark:bg-amber-950/20"
            )}
            style={{ height: rowHeight }}
          >
            {!hasContract && !hasMaintenance && (
              <div className="flex h-full items-center justify-center pointer-events-none">
                <CheckCircle2 className="size-4 text-green-400 opacity-40" />
              </div>
            )}
          </div>
        );
      })}

      {/* Contract bars overlay */}
      <div
        className="relative pointer-events-none"
        style={{
          gridColumn: `2 / -1`,
          height: rowHeight,
          marginTop: `-${rowHeight}px`,
        }}
      >
        {contractBars.map(({ contract, startIdx, endIdx, lane }) => {
          const left = (startIdx / numDays) * 100;
          const width = ((endIdx - startIdx + 1) / numDays) * 100;
          const top = 6 + lane * LANE_HEIGHT;

          return (
            <Link
              key={contract.id}
              href={`/contracts/${contract.id}`}
              className={cn(
                "absolute truncate rounded px-2 py-0.5 text-[10px] font-medium text-white transition-opacity hover:opacity-90 pointer-events-auto shadow-sm",
                statusColors[contract.status] ?? "bg-gray-400"
              )}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: `${top}px`,
                height: `${BAR_HEIGHT}px`,
                lineHeight: `${BAR_HEIGHT}px`,
              }}
              title={`${contract.contractNumber} — ${contract.clientName}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1">
                <FileText className="size-3 shrink-0" />
                <span className="truncate">{contract.clientName} — {contract.contractNumber}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Maintenance bars overlay */}
      <div
        className="relative pointer-events-none"
        style={{
          gridColumn: `2 / -1`,
          height: rowHeight,
          marginTop: `-${rowHeight}px`,
        }}
      >
        {maintenanceBars.map(({ maintenance, startIdx, endIdx, lane }) => {
          const left = (startIdx / numDays) * 100;
          const width = ((endIdx - startIdx + 1) / numDays) * 100;
          const top = 6 + lane * LANE_HEIGHT;

          return (
            <button
              key={maintenance.id}
              type="button"
              className="absolute truncate rounded px-2 py-0.5 text-[10px] font-medium text-white bg-amber-500/80 border border-amber-600 shadow-sm cursor-pointer hover:bg-amber-500 transition-colors text-left pointer-events-auto"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: `${top}px`,
                height: `${BAR_HEIGHT}px`,
                lineHeight: `${BAR_HEIGHT}px`,
              }}
              title={`${tMaint(maintenance.type)} — ${maintenance.description}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onMaintAction?.(maintenance.id, maintenance.type);
              }}
            >
              <span className="flex items-center gap-1">
                <Wrench className="size-3 shrink-0" />
                <span className="truncate">{tMaint(maintenance.type)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
