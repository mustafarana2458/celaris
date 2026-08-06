// Local-midnight date handling (matches the `${value}T00:00:00` convention
// used elsewhere in the app) so day-index math never drifts across a UTC
// day boundary.

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Greedy interval-scheduling lane packing: tasks that overlap in time within
// the same row get stacked into separate sub-rows instead of drawing on top
// of each other.
export function packLanes(items: { id: string; startIdx: number; endIdx: number }[]): Map<string, number> {
  const laneEnds: number[] = [];
  const laneOf = new Map<string, number>();
  const sorted = [...items].sort((a, b) => a.startIdx - b.startIdx);

  for (const item of sorted) {
    let placedLane = -1;
    for (let lane = 0; lane < laneEnds.length; lane++) {
      if (laneEnds[lane] < item.startIdx) {
        placedLane = lane;
        break;
      }
    }
    if (placedLane === -1) {
      placedLane = laneEnds.length;
      laneEnds.push(item.endIdx);
    } else {
      laneEnds[placedLane] = item.endIdx;
    }
    laneOf.set(item.id, placedLane);
  }

  return laneOf;
}
