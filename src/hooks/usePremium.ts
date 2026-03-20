"use client";

import { useState, useEffect, useCallback } from "react";

const PREMIUM_STORAGE_KEY = "qp-premium";

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const stored = localStorage.getItem(PREMIUM_STORAGE_KEY);
      setIsPremium(stored === "true");
    } catch {
      setIsPremium(false);
    }
  }, [mounted]);

  const setPremium = useCallback((value: boolean) => {
    try {
      localStorage.setItem(PREMIUM_STORAGE_KEY, String(value));
      setIsPremium(value);
    } catch {
      // ignore
    }
  }, []);

  return { isPremium, setPremium, mounted };
}
