const dateFormats = {
  short: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  long: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  dayMonth: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }),
  dateTime: new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
  time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }),
  monthYear: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }),
};

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput) {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: DateInput, style: keyof typeof dateFormats = "short") {
  const d = toDate(value);
  return d ? dateFormats[style].format(d) : "—";
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(value: DateInput, now = Date.now()) {
  const d = toDate(value);
  if (!d) return "";
  const seconds = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 86_400 * 7) return relative.format(Math.round(seconds / 86_400), "day");
  return formatDate(d);
}

export function formatDateRange(from: DateInput, to: DateInput) {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return formatDate(a ?? b);
  return `${dateFormats.dayMonth.format(a)} – ${dateFormats.dayMonth.format(b)}`;
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", options).format(value);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatResponseTime(minutes: number | null | undefined) {
  if (!minutes) return "—";
  if (minutes < 60) return `within ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours <= 1 ? "within an hour" : `within ${hours} hours`;
}

export function formatMm(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} mm`;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Adds business days (skips Saturday/Sunday) — used for delivery estimates. */
export function addBusinessDays(date: Date, days: number) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}
