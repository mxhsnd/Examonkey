"use client";

import { useState, useEffect, useCallback } from "react";
import type { AISettings } from "@/lib/types";

export function useSettings() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  async function saveSettings(newSettings: AISettings) {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });
    const data = await res.json();
    setSettings(data);
  }

  return { settings, loading, saveSettings, refetch: fetchSettings };
}
