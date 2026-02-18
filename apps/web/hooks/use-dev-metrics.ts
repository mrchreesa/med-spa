"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface UseDevMetricsResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

export function useDevMetrics<T>(
  endpoint: string,
  params: Record<string, string> = {},
  refreshInterval: number = 30000,
): UseDevMetricsResult<T> {
  const { getToken } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const searchParams = new URLSearchParams(params);
      const url = `${API_BASE}/api/v1/dev/${endpoint}?${searchParams}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(params), getToken]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refresh: fetchData, lastUpdated };
}
