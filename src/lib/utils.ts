import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format ISO date string ke WIB (Asia/Jakarta), mis. "09 Mei 2026, 14:30". */
export function formatWIB(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Format ISO date string ke jam WIB saja, mis. "14:30". */
export function formatTimeWIB(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  });
}
