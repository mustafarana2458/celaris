// Date-string math for the Forecasts dashboard. Deliberately works on
// y/m/d integers and formats to "YYYY-MM-DD" rather than using Date +
// toISOString(), so a user's local timezone never shifts a period boundary
// onto the wrong day.

export type ForecastPeriodType = "quarter" | "month";

export type PeriodBucket = {
  key: string;
  label: string;
  start: string;
  end: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function quarterOf(month: number) {
  return Math.floor((month - 1) / 3) + 1;
}

export function monthBucket(year: number, month: number): PeriodBucket {
  return {
    key: `${year}-${pad(month)}`,
    label: `${MONTH_LABELS[month - 1]} ${year}`,
    start: toDateString(year, month, 1),
    end: toDateString(year, month, daysInMonth(year, month)),
  };
}

export function quarterBucket(year: number, quarter: number): PeriodBucket {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    key: `${year}-Q${quarter}`,
    label: `Q${quarter} ${year}`,
    start: toDateString(year, startMonth, 1),
    end: toDateString(year, endMonth, daysInMonth(year, endMonth)),
  };
}

export function currentBucket(type: ForecastPeriodType, today: Date = new Date()): PeriodBucket {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  return type === "month" ? monthBucket(year, month) : quarterBucket(year, quarterOf(month));
}

// Trailing buckets ending at (and including) the current period -- oldest first,
// matching the app's existing RevenueChart trend convention.
export function trailingBuckets(
  type: ForecastPeriodType,
  count: number,
  today: Date = new Date()
): PeriodBucket[] {
  const year = today.getFullYear();
  const buckets: PeriodBucket[] = [];

  if (type === "month") {
    const month = today.getMonth() + 1;
    for (let i = count - 1; i >= 0; i--) {
      const totalMonths = year * 12 + (month - 1) - i;
      const y = Math.floor(totalMonths / 12);
      const m = (totalMonths % 12) + 1;
      buckets.push(monthBucket(y, m));
    }
  } else {
    const quarter = quarterOf(today.getMonth() + 1);
    for (let i = count - 1; i >= 0; i--) {
      const totalQuarters = year * 4 + (quarter - 1) - i;
      const y = Math.floor(totalQuarters / 4);
      const q = (totalQuarters % 4) + 1;
      buckets.push(quarterBucket(y, q));
    }
  }

  return buckets;
}

// Whole-year list of every quarter/month bucket -- used by the "+ Set Target"
// period picker so admins can also set a target for a future period.
export function yearBuckets(type: ForecastPeriodType, year: number): PeriodBucket[] {
  if (type === "month") {
    return Array.from({ length: 12 }, (_, i) => monthBucket(year, i + 1));
  }
  return Array.from({ length: 4 }, (_, i) => quarterBucket(year, i + 1));
}

export function dateInBucket(date: string | null, bucket: PeriodBucket) {
  if (!date) return false;
  return date >= bucket.start && date <= bucket.end;
}

export function bucketsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}
