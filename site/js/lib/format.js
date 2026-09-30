// Mirrors `enum Format` in Sources/ClaudeMeter/Theme.swift. Same reading, same words.

export const fmtPct = (n) => (n == null ? "—" : `${Math.round(n)}%`);

export function fmtDur(sec) {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const weekdayTime = (d) =>
  d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).replace(/,/g, "");

/**
 * fmtReset(seconds | Date | "Sat 1:05 PM")
 *  <48h → "resets in 2h 13m" · ≥48h → "resets Sat 1:05 PM" · ≤0 → "resetting…"
 * A string is treated as an already-formatted weekday time (demo data).
 */
export function fmtReset(v) {
  if (v == null) return " ";
  if (typeof v === "string") return `resets ${v}`;
  const sec = v instanceof Date ? (v.getTime() - Date.now()) / 1000 : v;
  if (sec <= 0) return "resetting…";
  if (sec < 48 * 3600) return `resets in ${fmtDur(sec)}`;
  const d = v instanceof Date ? v : new Date(Date.now() + sec * 1000);
  return `resets ${weekdayTime(d)}`;
}

export const fmtForecast = (sec) => `hits the cap in ${fmtDur(sec)}`;
export const CLEARS = "on track — resets first";

export function fmtAgo(v) {
  if (v == null) return "never";
  const sec = v instanceof Date ? (Date.now() - v.getTime()) / 1000 : v;
  if (sec < 90) return "just now";
  if (sec < 24 * 3600) return `${fmtDur(sec)} ago`;
  return weekdayTime(v instanceof Date ? v : new Date(Date.now() - sec * 1000));
}

/** macOS menu-bar clock: "Tue 2:47 PM" */
export const fmtClock = (d = new Date()) => weekdayTime(d);
