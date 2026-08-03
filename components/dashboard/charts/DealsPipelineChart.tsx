"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import type { DealStage } from "@/lib/types";

const STAGE_ORDER: DealStage[] = ["new", "qualified", "proposal", "won", "lost"];

const STAGE_LABELS: Record<DealStage, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const STAGE_COLORS: Record<DealStage, string> = {
  new: "rgb(var(--accent-rgb) / 0.35)",
  qualified: "rgb(var(--accent-rgb) / 0.55)",
  proposal: "rgb(var(--accent-rgb) / 0.75)",
  won: "rgb(var(--accent-rgb) / 1)",
  lost: "rgb(148 163 184 / 1)",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export type DealsByStage = { stage: DealStage; value: number };

export function DealsPipelineChart({ data }: { data: DealsByStage[] }) {
  const chartData = STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    value: data.find((d) => d.stage === stage)?.value ?? 0,
  }));
  const isEmpty = chartData.every((d) => d.value === 0);

  return (
    <ChartCard title="Deals pipeline" subtitle="Pipeline value by stage" isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
            width={40}
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
            labelStyle={{ color: "rgb(203 213 225)" }}
            formatter={(value: number) => [currency.format(value), "Pipeline value"]}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((d) => (
              <Cell key={d.stage} fill={STAGE_COLORS[d.stage]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
