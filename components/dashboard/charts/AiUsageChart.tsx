"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AiUsageChartPoint } from "@/lib/actions/aiUsage";

// Settings AI Usage tab's full-size chart -- single-series (credits used)
// bar chart with axes/grid. The sidebar widget uses its own minimal
// AiUsageSparkline instead, so this stays a plain full chart.
export function AiUsageChart({ data }: { data: AiUsageChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
          tick={{ fill: "currentColor", fontSize: 11 }}
          className="text-slate-400 dark:text-slate-500"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
          tick={{ fill: "currentColor", fontSize: 11 }}
          className="text-slate-400 dark:text-slate-500"
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
          formatter={(value: number) => [`${value} credit${value === 1 ? "" : "s"}`, "Used"]}
        />
        <Bar dataKey="credits" radius={[4, 4, 0, 0]} maxBarSize={40} fill="rgb(var(--accent-rgb))" />
      </BarChart>
    </ResponsiveContainer>
  );
}
