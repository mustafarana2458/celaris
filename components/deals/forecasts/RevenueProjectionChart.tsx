"use client";

import {
  Bar,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/dashboard/charts/ChartCard";
import type { BucketMetrics } from "./forecastMath";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const SERIES = [
  { key: "wonRevenue", label: "Won revenue", swatch: "rounded-sm bg-accent" },
  { key: "weightedForecast", label: "Weighted forecast", swatch: "rounded-sm bg-accent/35" },
  { key: "targetRevenue", label: "Target revenue", swatch: "h-0.5 rounded-full bg-slate-400 dark:bg-slate-500" },
] as const;

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      {SERIES.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 ${s.swatch}`} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function RevenueProjectionChart({ data }: { data: BucketMetrics[] }) {
  const chartData = data.map((d) => ({
    label: d.bucket.label,
    wonRevenue: d.wonRevenue,
    weightedForecast: d.weightedForecast,
    targetRevenue: d.targetRevenue,
  }));
  const isEmpty = chartData.every(
    (d) => d.wonRevenue === 0 && d.weightedForecast === 0 && d.targetRevenue === 0
  );

  return (
    <ChartCard
      title="Revenue projection"
      subtitle="Target vs. weighted forecast vs. won revenue, by expected close date"
      isEmpty={isEmpty}
      emptyMessage="No deals or targets in this range yet"
    >
      <div className="flex h-full flex-col gap-2">
        <Legend />
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke="currentColor"
                strokeOpacity={0.15}
                vertical={false}
                className="text-slate-300 dark:text-slate-600"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-slate-400 dark:text-slate-500"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-slate-400 dark:text-slate-500"
                tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))}
              />
              <Tooltip
                cursor={{ fill: "rgb(var(--accent-rgb) / 0.06)" }}
                wrapperStyle={{ zIndex: 50 }}
                contentStyle={{
                  backgroundColor: "rgb(15 23 42)",
                  border: "1px solid rgb(51 65 85)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "rgb(241 245 249)",
                  boxShadow: "0 4px 16px rgb(0 0 0 / 0.25)",
                }}
                labelStyle={{ color: "rgb(203 213 225)", fontWeight: 600, marginBottom: 2 }}
                itemStyle={{ color: "rgb(241 245 249)" }}
                formatter={(value: number, name: string) => {
                  const series = SERIES.find((s) => s.label === name || s.key === name);
                  return [currency.format(value), series?.label ?? name];
                }}
              />
              <Bar
                dataKey="wonRevenue"
                name="Won revenue"
                fill="rgb(var(--accent-rgb) / 1)"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="weightedForecast"
                name="Weighted forecast"
                fill="rgb(var(--accent-rgb) / 0.35)"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
              <Line
                dataKey="targetRevenue"
                name="Target revenue"
                type="monotone"
                stroke="rgb(148 163 184)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: "rgb(148 163 184)" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
