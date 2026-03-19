/**
 * Secure logging utility.
 * Only logs in development mode to prevent leaking internal details
 * (table names, column names, RLS errors) in production browser consoles.
 */
export function devError(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
}

export function devWarn(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
}
