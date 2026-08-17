"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AiUsageChartPoint } from "@/lib/actions/aiUsage";

// Shared between the sidebar's compact AI Usage widget and the settings AI
// Usage tab's full-size chart -- same single-series (credits used) bar
// chart, `compact` just strips the axes/grid down to a sparkline for the
// sidebar's tight footprint.
export function AiUsageChart({ data, compact = false }: { data: AiUsageChartPoint[]; compact?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={compact ? { top: 2, right: 0, left: 0, bottom: 0 } : { top: 4, right: 4, left: 0, bottom: 0 }}
      >
        {!compact && (
          <CartesianGrid
            stroke="currentColor"
            strokeOpacity={0.15}
            vertical={false}
            className="text-slate-300 dark:text-slate-600"
          />
        )}
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          hide={compact}
          tick={{ fill: "currentColor", fontSize: 11 }}
          className="text-slate-400 dark:text-slate-500"
        />
        {!compact && (
          <YAxis
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
            tick={{ fill: "currentColor", fontSize: 11 }}
            className="text-slate-400 dark:text-slate-500"
          />
        )}
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
          formatter={(value: number) => [`${value} credit${value === 1 ? "" : "s"}`, "Used"]}
        />
        <Bar dataKey="credits" radius={[4, 4, 0, 0]} maxBarSize={compact ? 10 : 40} fill="rgb(var(--accent-rgb))" />
      </BarChart>
    </ResponsiveContainer>
  );
}
