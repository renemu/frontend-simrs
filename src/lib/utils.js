import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes cleanly using clsx + tailwind-merge (standard shadcn/ui helper).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts up to 2 uppercase initials from a name or email.
 */
export function getInitials(nameOrEmail = "") {
  if (!nameOrEmail) return "U";
  const cleaned = String(nameOrEmail).trim();
  if (!cleaned) return "U";
  const parts = cleaned.split(/[\s._@-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

/**
 * Formats a date/timestamp string into readable Indonesian locale format.
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
