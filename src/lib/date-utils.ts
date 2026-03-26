/**
 * Date utilities for "absolute time" storage.
 *
 * Dates in the database are stored as "fake UTC" — the UTC components
 * (year, month, day, hour, minute) represent the local time the user typed.
 * E.g. user types 08:00 → stored as 08:00:00+00:00 in the DB.
 *
 * To display correctly, we must read UTC components, not local ones.
 */

/**
 * Convert a stored ISO date string to a Date object whose LOCAL methods
 * (getHours, getMinutes, etc.) return the values the user originally typed.
 *
 * This works by adding the browser's timezone offset to the UTC timestamp,
 * so that `date.getHours()` returns the UTC hour (which is the stored local hour).
 */
export function toDisplayDate(isoStr: string | null): Date | null {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return null;
  // Shift by local offset so getHours() returns UTC hours
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
}

/**
 * Format a stored date string to "dd/MM/yyyy HH:mm" using UTC components.
 */
export function formatStoredDate(isoStr: string | null, fmt: "datetime" | "date" | "time" | "short-date" = "datetime"): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "—";

  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");

  switch (fmt) {
    case "datetime": return `${day}/${month}/${year} ${hours}:${minutes}`;
    case "date": return `${day}/${month}/${year}`;
    case "time": return `${hours}:${minutes}`;
    case "short-date": return `${day}/${month}`;
    default: return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}

/**
 * Convert a datetime-local input value to an ISO string for storage.
 * Does NOT apply timezone conversion — appends +00:00 to store as-is.
 */
export function localInputToISO(value: string): string | null {
  if (!value) return null;
  // value is like "2026-03-19T08:00"
  return `${value}:00+00:00`;
}

/**
 * Convert a stored ISO date string to a datetime-local input value.
 * Reads UTC components since stored dates are "fake UTC".
 */
export function isoToLocalInput(isoStr: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get today's date range as ISO strings in "fake UTC" format,
 * based on the user's local date.
 */
export function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return {
    start: `${y}-${m}-${d}T00:00:00+00:00`,
    end: `${y}-${m}-${d}T23:59:59.999+00:00`,
  };
}

/**
 * Get current local time as a fake-UTC ISO string for comparisons
 * against stored dates.
 */
export function nowAsFakeUTC(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}:${s}+00:00`;
}

/**
 * Get end of today as a fake-UTC ISO string (23:59:59).
 * Useful for "overdue by day" comparisons where anything due today
 * should NOT be considered overdue.
 */
export function todayEndAsFakeUTC(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T23:59:59+00:00`;
}

/**
 * Get today's date string (YYYY-MM-DD) based on local time.
 */
/**
 * Convert a local Date object to a "fake UTC" ISO string.
 * Reads local components and appends +00:00.
 */
export function toFakeUTC(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${mi}:${s}+00:00`;
}

/**
 * Get today's date string (YYYY-MM-DD) based on local time.
 */
export function todayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
