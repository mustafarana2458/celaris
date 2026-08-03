"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export type RevenueByMonth = { month: string; total: number };

export function RevenueChart({ data }: { data: RevenueByMonth[] }) {
  const isEmpty = data.every((d) => d.total === 0);

  return (
    <ChartCard title="Revenue over time" subtitle="Paid invoices by month" isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="currentColor"
            strokeOpacity={0.15}
            vertical={false}
            className="text-slate-300 dark:text-slate-600"
          />
          <XAxis
            dataKey="month"
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
            formatter={(value: number) => [currency.format(value), "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="rgb(var(--accent-rgb))"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
