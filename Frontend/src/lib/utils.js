import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind class merge helper ──────────────────────────────────────────────
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ── Formatters ───────────────────────────────────────────────────────────────
export function formatCurrency(amount) {
  if (amount === undefined || amount === null) return "₨ 0.00";
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

// ── Validators ───────────────────────────────────────────────────────────────
export function validateQuantity(quantity, maxAllowed) {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) return "Quantity must be a positive number.";
  if (maxAllowed !== undefined && qty > maxAllowed) {
    return `Quantity cannot exceed ${maxAllowed}.`;
  }
  return null;
}
