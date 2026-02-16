"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";

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
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export default function SettingsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [greeting, setGreeting] = useState("");
  const [notifEmail, setNotifEmail] = useState("");
  const [notifPhone, setNotifPhone] = useState("");
  const [widgetColor, setWidgetColor] = useState("#2563eb");
  const [widgetPosition, setWidgetPosition] = useState("bottom-right");
  const [threshold, setThreshold] = useState(0.78);
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({});

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
      setWidgetColor(data.settings?.widget_color || "#2563eb");
      setWidgetPosition(data.settings?.widget_position || "bottom-right");
      setThreshold(data.settings?.similarity_threshold ?? 0.78);

      // Initialize business hours
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
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Failed to save settings. Please try again.");
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure your med spa, notifications, and chat widget
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {saved && (
        <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Business Info */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Business Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Glow Med Spa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </section>

      {/* Business Hours */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Business Hours</h2>
        <div className="mt-4 space-y-2">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-10 text-sm font-medium text-gray-700">
                {dayLabels[day]}
              </span>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={!hours[day]?.closed}
                  onChange={(e) =>
                    setHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], closed: !e.target.checked },
                    }))
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">Open</span>
              </label>
              {!hours[day]?.closed ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={hours[day]?.open || "09:00"}
                    onChange={(e) =>
                      setHours((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], open: e.target.value },
                      }))
                    }
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="time"
                    value={hours[day]?.close || "17:00"}
                    onChange={(e) =>
                      setHours((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], close: e.target.value },
                      }))
                    }
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ) : (
                <span className="text-xs text-gray-400">Closed</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Chat Widget */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Chat Widget</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Greeting Message
            </label>
            <textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Welcome! How can I help you today?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Widget Color
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={widgetColor}
                  onChange={(e) => setWidgetColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={widgetColor}
                  onChange={(e) => setWidgetColor(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Widget Position
              </label>
              <select
                value={widgetPosition}
                onChange={(e) => setWidgetPosition(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Escalation Notifications</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notification Email
            </label>
            <input
              type="email"
              value={notifEmail}
              onChange={(e) => setNotifEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="staff@yourspa.com"
            />
            <p className="mt-1 text-xs text-gray-400">
              Receives alerts when conversations are escalated
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notification Phone (SMS)
            </label>
            <input
              type="tel"
              value={notifPhone}
              onChange={(e) => setNotifPhone(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </section>

      {/* Knowledge Base Settings */}
      <section className="mt-8 mb-12">
        <h2 className="text-lg font-semibold text-gray-900">Knowledge Base</h2>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Similarity Threshold
          </label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="w-12 text-sm font-medium text-gray-700 text-right">
              {threshold.toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Higher values return more relevant but fewer results. Default: 0.78
          </p>
        </div>
      </section>
    </div>
  );
}
