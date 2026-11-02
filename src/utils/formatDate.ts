/**
 * src/utils/formatDate.ts
 * Formats ISO timestamps or raw date strings into friendly Vietnamese display format.
 * E.g., "2026-08-09T17:51:38.633Z" -> "17:51, 09/08/2026"
 */

export function formatVietnameseDateTime(dateInput?: string | number | Date): string {
  if (!dateInput) return 'Vừa xong';

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      // Return as is if already formatted string
      return String(dateInput);
    }

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${hours}:${minutes}, ${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}
