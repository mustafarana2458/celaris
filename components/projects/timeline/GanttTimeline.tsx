import { CheckCircle2 } from "lucide-react";
import { tagColor } from "@/lib/tagColors";
import type { Milestone } from "@/lib/types";

const PX_PER_DAY = 14;
const MIN_SPAN_DAYS = 60;
const PAD_BEFORE_DAYS = 7;
const PAD_AFTER_DAYS = 21;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Builds the [start, end] window the timeline draws, and the month-boundary
// ticks that fall inside it. Defaults to a rolling "today - 2wk to +3mo"
// window when there's nothing dated yet, so the ruler is never degenerate.
function computeRange(dueDates: Date[]) {
  const today = new Date(today0());
  let start: Date;
  let end: Date;

  if (dueDates.length === 0) {
    start = addDays(today, -PAD_BEFORE_DAYS);
    end = addDays(today, 90);
  } else {
    const min = new Date(Math.min(...dueDates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dueDates.map((d) => d.getTime())));
    start = addDays(min, -PAD_BEFORE_DAYS);
    end = addDays(max, PAD_AFTER_DAYS);
    if (daysBetween(start, end) < MIN_SPAN_DAYS) {
      end = addDays(start, MIN_SPAN_DAYS);
    }
  }

  start = startOfMonth(start);

  const ticks: { date: Date; label: string; offsetDays: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    ticks.push({
      date: new Date(cursor),
      label: `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`,
      offsetDays: daysBetween(start, cursor),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return { start, end, ticks };
}

function today0() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type ProjectRow = {
  id: string;
  name: string;
  milestones: Milestone[];
};

export function GanttTimeline({ rows }: { rows: ProjectRow[] }) {
  const allDueDates = rows.flatMap((r) => r.milestones.filter((m) => m.due_date).map((m) => parseDate(m.due_date!)));
  const { start, end, ticks } = computeRange(allDueDates);
  const totalDays = daysBetween(start, end);
  const totalWidth = totalDays * PX_PER_DAY;
  const todayOffset = daysBetween(start, today0());

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex overflow-x-auto">
        {/* Sticky project-name column */}
        <div className="sticky left-0 z-10 w-40 shrink-0 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="h-10 border-b border-slate-200 dark:border-slate-700" />
          {rows.map((row) => {
            const colors = tagColor(row.name);
            return (
              <div key={row.id} className="flex h-16 items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-700/60">
                <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300" title={row.name}>
                  {row.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable ruler + lanes */}
        <div className="relative" style={{ width: totalWidth }}>
          <div className="relative h-10 border-b border-slate-200 dark:border-slate-700">
            {ticks.map((tick) => (
              <div
                key={tick.label}
                className="absolute top-0 h-full border-l border-slate-100 pl-2 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400"
                style={{ left: tick.offsetDays * PX_PER_DAY }}
              >
                <span className="flex h-full items-center">{tick.label}</span>
              </div>
            ))}
          </div>

          {todayOffset >= 0 && todayOffset <= totalDays && (
            <div
              className="pointer-events-none absolute top-0 z-[1] w-px bg-accent/50"
              style={{ left: todayOffset * PX_PER_DAY, height: rows.length * 64 + 40 }}
              title="Today"
            />
          )}

          {rows.map((row) => {
            const colors = tagColor(row.name);
            return (
              <div key={row.id} className="relative h-16 border-b border-slate-100 dark:border-slate-700/60">
                {row.milestones.map((m) => {
                  if (!m.due_date) return null;
                  const offset = daysBetween(start, parseDate(m.due_date));
                  return (
                    <div
                      key={m.id}
                      className={`absolute top-1/2 flex max-w-[180px] -translate-y-1/2 items-center gap-1 rounded-full border px-2 py-1 text-xs shadow-sm ${
                        m.is_done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : `${colors.badge} border-transparent`
                      }`}
                      style={{ left: offset * PX_PER_DAY }}
                      title={`${m.title} — ${m.due_date}${m.is_done ? " (done)" : ""}`}
                    >
                      {m.is_done && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{m.title}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
