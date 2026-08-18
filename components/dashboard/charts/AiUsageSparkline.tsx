"use client";

import { Area, AreaChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AiUsageChartPoint } from "@/lib/actions/aiUsage";

// Minimal trend line for the sidebar AI Usage widget -- no axes/grid/legend,
// just a smooth line with a soft gradient fill and a dot on the latest
// point. The full bar chart with visible axes (settings AI Usage tab) lives
// in AiUsageChart.tsx and is untouched by this.
export function AiUsageSparkline({ data }: { data: AiUsageChartPoint[] }) {
  const latest = data[data.length - 1];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 2 }}>
        <defs>
          <linearGradient id="aiUsageSparklineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0.32} />
            <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Tooltip
          cursor={false}
          wrapperStyle={{ zIndex: 50 }}
          contentStyle={{
            backgroundColor: "rgb(15 23 42)",
            border: "1px solid rgb(51 65 85)",
            borderRadius: 8,
            fontSize: 11,
            padding: "4px 8px",
            color: "rgb(241 245 249)",
          }}
          labelFormatter={() => ""}
          formatter={(value: number) => [`${value} credit${value === 1 ? "" : "s"}`, "Used"]}
        />
        <Area
          type="monotone"
          dataKey="credits"
          stroke="rgb(var(--accent-rgb))"
          strokeWidth={1.75}
          fill="url(#aiUsageSparklineFill)"
          dot={false}
          isAnimationActive={false}
        />
        {latest && (
          <ReferenceDot
            x={latest.label}
            y={latest.credits}
            r={2.5}
            fill="rgb(var(--accent-rgb))"
            stroke="none"
            isFront
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
