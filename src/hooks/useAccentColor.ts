"use client";

import { useState, useEffect, useCallback } from "react";

const ACCENT_STORAGE_KEY = "qp-accent-color";

export const ACCENT_COLORS = [
  { id: "coral", name: "コーラル", value: "#ff6b6b" },
  { id: "blue", name: "ブルー", value: "#3b82f6" },
  { id: "green", name: "グリーン", value: "#22c55e" },
  { id: "purple", name: "パープル", value: "#a855f7" },
  { id: "amber", name: "アンバー", value: "#f59e0b" },
  { id: "teal", name: "ティール", value: "#14b8a6" },
  { id: "pink", name: "ピンク", value: "#ec4899" },
] as const;

const DEFAULT_ACCENT = ACCENT_COLORS[0].value;

function applyAccent(color: string) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--toast", color);
}

export function useAccentColor(isPremium: boolean) {
  const [accentColor, setAccentColorState] = useState<string>(DEFAULT_ACCENT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isPremium) {
      applyAccent(DEFAULT_ACCENT);
      setAccentColorState(DEFAULT_ACCENT);
      return;
    }
    try {
      const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
      const found = ACCENT_COLORS.find((c) => c.id === stored || c.value === stored);
      const color = found?.value ?? DEFAULT_ACCENT;
      setAccentColorState(color);
      applyAccent(color);
    } catch {
      setAccentColorState(DEFAULT_ACCENT);
      applyAccent(DEFAULT_ACCENT);
    }
  }, [mounted, isPremium]);

  useEffect(() => {
    if (isPremium && mounted) applyAccent(accentColor);
  }, [accentColor, isPremium, mounted]);

  const setAccentColor = useCallback((color: string) => {
    const found = ACCENT_COLORS.find((c) => c.value === color);
    const value = found?.value ?? color;
    setAccentColorState(value);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, found?.id ?? value);
    } catch {
      // ignore
    }
    applyAccent(value);
  }, []);

  return { accentColor, setAccentColor, mounted, accentColors: ACCENT_COLORS };
}
