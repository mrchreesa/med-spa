"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { PageLoader } from "@/components/ui/loading-spinner";
import {
  Building2,
  Clock,
  MessageCircle,
  Bell,
  BookOpen,
  Save,
  Check,
} from "lucide-react";

interface TenantSettings {
  name: string;
  phone_number: string | null;
  business_hours: Record<string, { open: string; close: string; closed?: boolean }> | null;
  settings: {
    greeting_message?: string;
    notification_email?: string;
    notification_phone?: string;
    widget_color?: string;
    widget_position?: string;
    similarity_threshold?: number;
  };
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const dayLabels: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export default function SettingsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [greeting, setGreeting] = useState("");
  const [notifEmail, setNotifEmail] = useState("");
  const [notifPhone, setNotifPhone] = useState("");
  const [widgetColor, setWidgetColor] = useState("#8B7355");
  const [widgetPosition, setWidgetPosition] = useState("bottom-right");
  const [threshold, setThreshold] = useState(0.78);
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({});

  const markChanged = () => setHasChanges(true);

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await api.get<TenantSettings>("/settings", {
        token: token || undefined,
      });
      setName(data.name || "");
      setPhone(data.phone_number || "");
      setGreeting(data.settings?.greeting_message || "");
      setNotifEmail(data.settings?.notification_email || "");
      setNotifPhone(data.settings?.notification_phone || "");
      setWidgetColor(data.settings?.widget_color || "#8B7355");
      setWidgetPosition(data.settings?.widget_position || "bottom-right");
      setThreshold(data.settings?.similarity_threshold ?? 0.78);

      const existingHours = data.business_hours || {};
      const h: Record<string, { open: string; close: string; closed: boolean }> = {};
      for (const day of DAYS) {
        h[day] = {
          open: existingHours[day]?.open || "09:00",
          close: existingHours[day]?.close || "17:00",
          closed: existingHours[day]?.closed ?? (day === "sunday"),
        };
      }
      setHours(h);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const token = await getToken();
      await api.patch(
        "/settings",
        {
          name: name || undefined,
          phone_number: phone || undefined,
          business_hours: hours,
          greeting_message: greeting || undefined,
          notification_email: notifEmail || undefined,
          notification_phone: notifPhone || undefined,
          widget_color: widgetColor,
          widget_position: widgetPosition,
          similarity_threshold: threshold,
        },
        { token: token || undefined }
      );
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Failed to save settings. Please try again.");
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-2xl animate-fade-up pb-16">
      <PageHeader
        title="Settings"
        subtitle="Configure your med spa, notifications, and chat widget"
      />

      {saved && (
        <Card className="mb-4 bg-spa-success/10 border-spa-success/30">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-spa-success" />
            <p className="text-sm text-spa-success font-medium">Settings saved successfully.</p>
          </div>
        </Card>
      )}
      {error && (
        <Card className="mb-4 bg-spa-danger/10 border-spa-danger/30">
          <p className="text-sm text-spa-danger">{error}</p>
        </Card>
      )}

      <div className="space-y-6">
        {/* Business Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-4.5 w-4.5 text-spa-primary" />
              <CardTitle>Business Information</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-4">
            <Input
              label="Business Name"
              value={name}
              onChange={(e) => { setName(e.target.value); markChanged(); }}
              placeholder="Glow Med Spa"
            />
            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); markChanged(); }}
              placeholder="(555) 123-4567"
            />
          </div>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-spa-primary" />
              <CardTitle>Business Hours</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-2">
            {DAYS.map((day) => {
              const isClosed = hours[day]?.closed;
              return (
                <div
                  key={day}
                  className="flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors"
                  style={{
                    backgroundColor: isClosed ? "transparent" : "var(--surface-secondary)",
                    opacity: isClosed ? 0.5 : 1,
                  }}
                >
                  <span
                    className="w-24 text-sm font-medium shrink-0"
                    style={{ color: "var(--text)" }}
                  >
                    {dayLabels[day]}
                  </span>
                  <ToggleSwitch
                    checked={!isClosed}
                    onChange={(checked) => {
                      setHours((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], closed: !checked },
                      }));
                      markChanged();
                    }}
                  />
                  {!isClosed ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={hours[day]?.open || "09:00"}
                        onChange={(e) => {
                          setHours((prev) => ({
                            ...prev,
                            [day]: { ...prev[day], open: e.target.value },
                          }));
                          markChanged();
                        }}
                        className="rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-spa-accent/30"
                        style={{
                          backgroundColor: "var(--surface)",
                          borderColor: "var(--border)",
                          color: "var(--text)",
                        }}
                      />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>to</span>
                      <input
                        type="time"
                        value={hours[day]?.close || "17:00"}
                        onChange={(e) => {
                          setHours((prev) => ({
                            ...prev,
                            [day]: { ...prev[day], close: e.target.value },
                          }));
                          markChanged();
                        }}
                        className="rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-spa-accent/30"
                        style={{
                          backgroundColor: "var(--surface)",
                          borderColor: "var(--border)",
                          color: "var(--text)",
                        }}
                      />
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Chat Widget */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4.5 w-4.5 text-spa-primary" />
              <CardTitle>Chat Widget</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-4">
            <Textarea
              label="Greeting Message"
              value={greeting}
              onChange={(e) => { setGreeting(e.target.value); markChanged(); }}
              rows={3}
              placeholder="Welcome! How can I help you today?"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Widget Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={widgetColor}
                    onChange={(e) => { setWidgetColor(e.target.value); markChanged(); }}
                    className="h-9 w-9 cursor-pointer rounded-lg border"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <input
                    type="text"
                    value={widgetColor}
                    onChange={(e) => { setWidgetColor(e.target.value); markChanged(); }}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-spa-accent/30"
                    style={{
                      backgroundColor: "var(--surface)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>
                {/* Mini preview */}
                <div className="mt-2 flex justify-end">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-colors"
                    style={{ backgroundColor: widgetColor }}
                  >
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <Select
                label="Widget Position"
                options={[
                  { value: "bottom-right", label: "Bottom Right" },
                  { value: "bottom-left", label: "Bottom Left" },
                ]}
                value={widgetPosition}
                onChange={(e) => { setWidgetPosition(e.target.value); markChanged(); }}
              />
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-spa-primary" />
              <CardTitle>Escalation Notifications</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <Input
                label="Notification Email"
                type="email"
                value={notifEmail}
                onChange={(e) => { setNotifEmail(e.target.value); markChanged(); }}
                placeholder="staff@yourspa.com"
              />
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                Receives alerts when conversations are escalated
              </p>
            </div>
            <Input
              label="Notification Phone (SMS)"
              type="tel"
              value={notifPhone}
              onChange={(e) => { setNotifPhone(e.target.value); markChanged(); }}
              placeholder="(555) 123-4567"
            />
          </div>
        </Card>

        {/* Knowledge Base */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-spa-primary" />
              <CardTitle>Knowledge Base</CardTitle>
            </div>
          </CardHeader>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Similarity Threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.01"
                value={threshold}
                onChange={(e) => { setThreshold(parseFloat(e.target.value)); markChanged(); }}
                className="flex-1 accent-spa-accent"
              />
              <span
                className="w-12 text-sm font-semibold text-right"
                style={{ color: "var(--text)" }}
              >
                {threshold.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Higher values return more relevant but fewer results. Default: 0.78
            </p>
          </div>
        </Card>
      </div>

      {/* Sticky save bar */}
      {hasChanges && (
        <div
          className="fixed bottom-0 left-64 right-0 px-6 py-3 flex items-center justify-end gap-3 border-t z-50"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
          }}
        >
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            You have unsaved changes
          </span>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
