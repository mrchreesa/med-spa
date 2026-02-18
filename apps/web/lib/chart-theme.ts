export const chartColors = {
  primary: "#8B7355",
  accent: "#C9A96E",
  success: "#7BA68B",
  warning: "#D4A853",
  danger: "#C45B4A",
  info: "#7B95A8",
  muted: "#A39E9A",
};

export const statusChartColors: Record<string, string> = {
  new: "#7B95A8",
  contacted: "#D4A853",
  qualified: "#C9A96E",
  booked: "#7BA68B",
  lost: "#A39E9A",
};

export const sourceChartColors: Record<string, string> = {
  web_chat: "#8B7355",
  phone: "#7BA68B",
  sms: "#7B95A8",
};

export const intentChartColors: Record<string, string> = {
  appointment: "#7BA68B",
  pricing: "#C9A96E",
  treatment_info: "#8B7355",
  complaint: "#C45B4A",
  general: "#7B95A8",
  emergency: "#D4A853",
};

export const chartPalette = [
  "#8B7355",
  "#C9A96E",
  "#7BA68B",
  "#D4A853",
  "#7B95A8",
  "#C45B4A",
  "#A39E9A",
];

export const tooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text)",
    fontSize: "13px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  labelStyle: {
    color: "var(--text-secondary)",
    fontWeight: 600,
    marginBottom: "4px",
  },
};
