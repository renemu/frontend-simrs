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

/**
 * Formats a date-only string (YYYY-MM-DD) into readable Indonesian date format.
 */
export function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Formats numeric amount into IDR currency string.
 */
export function formatCurrency(amount) {
  const num = Number(amount || 0);
  if (Number.isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Returns YYYY-MM-DD in the browser's local timezone (avoids UTC day-shift from toISOString()).
 */
export function formatLocalDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalTodayDate() {
  return formatLocalDateInput(new Date());
}

export function getLocalFirstOfMonthDate() {
  const now = new Date();
  return formatLocalDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}
