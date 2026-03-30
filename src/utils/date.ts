// Date formatting helpers.

export function formatDateTime(isoDate: string): string {
  // TODO: Replace with IST-aware formatting strategy.
  return new Date(isoDate).toLocaleString();
}
