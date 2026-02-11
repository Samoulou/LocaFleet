"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DatePickerProps = {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
  className?: string;
  showTime?: boolean;
  confirmLabel?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function DatePicker({
  value,
  onChange,
  placeholder = "Sélectionner une date",
  disabled,
  fromDate,
  toDate,
  className,
  showTime = false,
  confirmLabel = "Confirmer",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [pendingDate, setPendingDate] = React.useState<Date | undefined>(
    undefined
  );

  // Sync pendingDate when popover opens
  React.useEffect(() => {
    if (open) {
      setPendingDate(value);
    }
  }, [open, value]);

  function handleCalendarSelect(date: Date | undefined) {
    if (!showTime) {
      onChange(date);
      setOpen(false);
      return;
    }

    // In showTime mode: keep the hours/minutes from pending
    if (date) {
      const updated = new Date(date);
      if (pendingDate) {
        updated.setHours(
          pendingDate.getHours(),
          pendingDate.getMinutes(),
          0,
          0
        );
      } else {
        updated.setHours(9, 0, 0, 0);
      }
      setPendingDate(updated);
    } else {
      setPendingDate(undefined);
    }
  }

  function handleHourChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!pendingDate) return;
    const updated = new Date(pendingDate);
    updated.setHours(parseInt(e.target.value, 10));
    setPendingDate(updated);
  }

  function handleMinuteChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!pendingDate) return;
    const updated = new Date(pendingDate);
    updated.setMinutes(parseInt(e.target.value, 10));
    setPendingDate(updated);
  }

  function handleConfirm() {
    onChange(pendingDate);
    setOpen(false);
  }

  const displayValue = value
    ? showTime
      ? formatDateTime(value)
      : formatDate(value)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={pendingDate ?? value}
          onSelect={handleCalendarSelect}
          disabled={disabled}
          startMonth={fromDate}
          endMonth={toDate}
        />
        {showTime && (
          <div className="border-t border-slate-200 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 min-w-12">Heure</label>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={
                  pendingDate
                    ? String(pendingDate.getHours()).padStart(2, "0")
                    : "09"
                }
                onChange={handleHourChange}
                disabled={!pendingDate}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">:</span>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={
                  pendingDate
                    ? String(pendingDate.getMinutes()).padStart(2, "0")
                    : "00"
                }
                onChange={handleMinuteChange}
                disabled={!pendingDate}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={handleConfirm}
              disabled={!pendingDate}
            >
              {confirmLabel}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
