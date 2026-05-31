"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  /** Selected date (Date) or null/undefined for unset. */
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Show a small "clear" affordance inside the trigger when a date is set. */
  clearable?: boolean;
  className?: string;
  /** Forwarded to the underlying button — useful for `aria-invalid`, ids, etc. */
  buttonProps?: Omit<React.ComponentProps<typeof Button>, "children" | "onClick">;
}

/**
 * Composed date picker: a button trigger that opens a Popover containing the
 * Calendar. Replaces the native `<input type="date">` for a consistent UI
 * across browsers and platforms.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  clearable = true,
  className,
  buttonProps,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          {...buttonProps}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
            buttonProps?.className,
          )}
        >
          <CalendarIcon className="size-4 opacity-70" />
          <span className="flex-1 truncate">
            {value ? format(value, "PPP") : placeholder}
          </span>
          {value && clearable ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              className="-mr-1 grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                }
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(date) => {
            onChange(date ?? null);
            if (date) setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
