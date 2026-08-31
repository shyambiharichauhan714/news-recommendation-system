import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely, resolving conflicts (last wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an ISO date string as a relative "time ago" label. */
export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  const intervals: [number, string][] = [
    [31536000, "y"],
    [2592000, "mo"],
    [604800, "w"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];

  for (const [secondsInUnit, label] of intervals) {
    const count = Math.floor(seconds / secondsInUnit);
    if (count >= 1) return `${count}${label} ago`;
  }
  return "just now";
}

/** Format an ISO date string as e.g. "Aug 28, 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format an ISO date string as e.g. "3:42 PM". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Category -> Tailwind color token mapping used across cards/badges/charts. */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string; chart: string }> = {
  Technology: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", chart: "#4A63FA" },
  "AI & Machine Learning": { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", chart: "#8B5CF6" },
  Business: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", chart: "#F59E0B" },
  Sports: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", chart: "#10B981" },
  Science: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500", chart: "#06B6D4" },
  Politics: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", chart: "#F43F5E" },
  Entertainment: { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-500", chart: "#EC4899" },
  Health: { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500", chart: "#14B8A6" },
};

export function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-400", chart: "#9CA3AF" };
}
