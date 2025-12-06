"use client";

import { useState, useEffect, useCallback } from "react";

export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setState(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load from localStorage:", e);
    }
    setHydrated(true);
  }, [key]);

  // Save to localStorage on change
  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
    }
  }, [key, state, hydrated]);

  const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(value);
  }, []);

  return [state, setPersistedState];
}

// Check if we should show onboarding
export function useOnboarding(): [boolean, () => void] {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("router_onboarding_seen");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
    setChecked(true);
  }, []);

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem("router_onboarding_seen", "true");
    setShowOnboarding(false);
  }, []);

  return [checked && showOnboarding, dismissOnboarding];
}

