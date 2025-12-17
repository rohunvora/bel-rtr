"use client";

import { useState, useEffect, useCallback } from "react";
import { ChartAnalysis } from "./chart-analysis";

// Helper to get stored value
function getStoredValue<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load from localStorage:", e);
  }
  return defaultValue;
}

export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Use lazy initialization to avoid setState in effect
  const [state, setState] = useState<T>(() => getStoredValue(key, defaultValue));
  const [hydrated, setHydrated] = useState(false);

  // Mark as hydrated after mount
  useEffect(() => {
    // Re-read from storage on mount to handle SSR hydration
    const stored = getStoredValue(key, defaultValue);
    setState(stored);
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // Use lazy initialization
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("chart_analyst_onboarding_seen");
  });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Re-check on mount for SSR
    const hasSeenOnboarding = localStorage.getItem("chart_analyst_onboarding_seen");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
    setChecked(true);
  }, []);

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem("chart_analyst_onboarding_seen", "true");
    setShowOnboarding(false);
  }, []);

  return [checked && showOnboarding, dismissOnboarding];
}

// ============================================
// ANALYSIS HISTORY
// ============================================

export interface SavedAnalysis {
  id: string;
  analysis: ChartAnalysis;
  chartThumbnail: string;  // base64, small version
  prompt: string;
  savedAt: string;
}

export function useAnalysisHistory() {
  const [history, setHistory] = usePersistedState<SavedAnalysis[]>("chart_analyst_history", []);
  
  const saveAnalysis = useCallback((
    analysis: ChartAnalysis,
    chartImage: string,
    prompt: string
  ) => {
    const saved: SavedAnalysis = {
      id: `analysis-${Date.now()}`,
      analysis,
      chartThumbnail: chartImage.slice(0, 5000), // Truncate for storage
      prompt,
      savedAt: new Date().toISOString(),
    };
    
    setHistory((prev) => [saved, ...prev].slice(0, 20)); // Keep last 20
    return saved.id;
  }, [setHistory]);
  
  const removeAnalysis = useCallback((id: string) => {
    setHistory((prev) => prev.filter((a) => a.id !== id));
  }, [setHistory]);
  
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);
  
  // Get recent analyses for a symbol
  const getForSymbol = useCallback((symbol: string) => {
    return history.filter((a) => a.analysis.symbol?.toLowerCase() === symbol.toLowerCase());
  }, [history]);
  
  return {
    history,
    saveAnalysis,
    removeAnalysis,
    clearHistory,
    getForSymbol,
  };
}

// ============================================
// LEARNED CONCEPTS (for progressive education)
// ============================================

export function useLearnedConcepts() {
  const [concepts, setConcepts] = usePersistedState<string[]>("chart_analyst_learned", []);
  
  const markLearned = useCallback((concept: string) => {
    setConcepts((prev) => {
      if (prev.includes(concept)) return prev;
      return [...prev, concept];
    });
  }, [setConcepts]);
  
  const hasLearned = useCallback((concept: string) => {
    return concepts.includes(concept);
  }, [concepts]);
  
  const resetLearning = useCallback(() => {
    setConcepts([]);
  }, [setConcepts]);
  
  return {
    learnedConcepts: concepts,
    markLearned,
    hasLearned,
    resetLearning,
  };
}
