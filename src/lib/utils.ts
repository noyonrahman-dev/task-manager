import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse an HTML `<input type="date">` value (`YYYY-MM-DD`) into an ISO string
 * anchored to UTC midnight. Returns `null` for empty or invalid values.
 */
export function parseDateInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = match[1];
  const m = match[2];
  const d = match[3];
  if (!y || !m || !d) return null;
  const iso = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).toISOString();
  return iso;
}

/** Format an ISO timestamp back to `YYYY-MM-DD` for use in date inputs. */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
