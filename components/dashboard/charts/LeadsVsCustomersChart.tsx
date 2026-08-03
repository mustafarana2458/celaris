"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartCard } from "./ChartCard";

export type LeadsVsCustomers = { leads: number; customers: number };

export function LeadsVsCustomersChart({ data }: { data: LeadsVsCustomers }) {
  const isEmpty = data.leads === 0 && data.customers === 0;
  const chartData = [
    { name: "Leads", value: data.leads, color: "rgb(148 163 184 / 1)" },
    { name: "Customers", value: data.customers, color: "rgb(var(--accent-rgb) / 1)" },
  ];

  return (
    <ChartCard title="Leads vs customers" subtitle="Contact type breakdown" isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="85%"
            paddingAngle={chartData.filter((d) => d.value > 0).length > 1 ? 3 : 0}
            strokeWidth={0}
          >
            {chartData.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
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
            formatter={(value: number, name: string) => [value, name]}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-xs text-slate-500 dark:text-slate-400">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
