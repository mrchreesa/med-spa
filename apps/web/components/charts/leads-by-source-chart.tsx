"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { sourceChartColors, tooltipStyle } from "@/lib/chart-theme";

const sourceLabels: Record<string, string> = {
  web_chat: "Web Chat",
  phone: "Phone",
  sms: "SMS",
};

interface LeadsBySourceChartProps {
  data: Record<string, number>;
}

export function LeadsBySourceChart({ data }: LeadsBySourceChartProps) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: sourceLabels[key] || key,
    value,
    key,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <XAxis
          type="number"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value) => [String(value), "Leads"]}
          cursor={{ fill: "var(--surface-secondary)", opacity: 0.5 }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
          {chartData.map((entry) => (
            <Cell
              key={entry.key}
              fill={sourceChartColors[entry.key] || "#8B7355"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
