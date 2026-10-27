// Display helpers shared by server and client components.

/** "2026-12-12" → "Sat, Dec 12, 2026" (parsed as a calendar date, so no timezone shifts). */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  });
}

/** "18:30" → "6:30 PM"; "" → "" */
export function formatTime(hhmm: string) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function priceLabel(level: number | null) {
  return level ? "$".repeat(level) : null;
}

export function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 });
}
