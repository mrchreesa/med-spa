"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { statusChartColors, tooltipStyle } from "@/lib/chart-theme";

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  booked: "Booked",
  lost: "Lost",
};

interface LeadsByStatusChartProps {
  data: Record<string, number>;
}

export function LeadsByStatusChart({ data }: LeadsByStatusChartProps) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: statusLabels[key] || key,
    value,
    key,
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.key}
              fill={statusChartColors[entry.key] || "#A39E9A"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value) => [String(value), "Leads"]}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
