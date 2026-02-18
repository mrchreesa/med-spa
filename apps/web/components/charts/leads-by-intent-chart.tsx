"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { intentChartColors, tooltipStyle } from "@/lib/chart-theme";

const intentLabels: Record<string, string> = {
  appointment: "Appointment",
  pricing: "Pricing",
  treatment_info: "Treatment Info",
  complaint: "Complaint",
  general: "General",
  emergency: "Emergency",
};

interface LeadsByIntentChartProps {
  data: Record<string, number>;
}

export function LeadsByIntentChart({ data }: LeadsByIntentChartProps) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: intentLabels[key] || key,
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
      <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
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
          width={100}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value) => [String(value), "Leads"]}
          cursor={{ fill: "var(--surface-secondary)", opacity: 0.5 }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
          {chartData.map((entry) => (
            <Cell
              key={entry.key}
              fill={intentChartColors[entry.key] || "#A39E9A"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
