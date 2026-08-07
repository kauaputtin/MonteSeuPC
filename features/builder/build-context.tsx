"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { calculateBuildTotal } from "@/lib/calculations";
import { calculateEstimatedWatts, calculateRecommendedPsuWatts, evaluateBuild, getOverallStatus } from "@/lib/compatibility/compatibility-engine";
import type { CategorySlug, Component, Offer, SelectedComponents, SelectedOffers } from "@/types/domain";

const STORAGE_KEY = "monte-seu-pc:build:v1";

interface BuildState {
  currentStep: number;
  components: SelectedComponents;
  offers: SelectedOffers;
}

type Action =
  | { type: "SELECT_COMPONENT"; component: Component }
  | { type: "SELECT_OFFER"; category: CategorySlug; offer: Offer }
  | { type: "SET_STEP"; step: number }
  | { type: "RESTORE"; state: BuildState }
  | { type: "CLEAR" };

const initialState: BuildState = { currentStep: 0, components: {}, offers: {} };

function reducer(state: BuildState, action: Action): BuildState {
  switch (action.type) {
    case "SELECT_COMPONENT": {
      const category = action.component.categorySlug;
      const sameItem = state.components[category]?.id === action.component.id;
      return {
        ...state,
        components: { ...state.components, [category]: action.component },
        offers: sameItem ? state.offers : { ...state.offers, [category]: undefined }
      };
    }
    case "SELECT_OFFER": return { ...state, offers: { ...state.offers, [action.category]: action.offer } };
    case "SET_STEP": return { ...state, currentStep: Math.max(0, Math.min(8, action.step)) };
    case "RESTORE": return action.state;
    case "CLEAR": return initialState;
  }
}

interface BuildContextValue extends BuildState {
  hydrated: boolean;
  alerts: ReturnType<typeof evaluateBuild>;
  overallStatus: ReturnType<typeof getOverallStatus>;
  estimatedWatts: number;
  recommendedPsuWatts: number;
  total: number;
  selectComponent: (component: Component) => void;
  selectOffer: (category: CategorySlug, offer: Offer) => void;
  setStep: (step: number) => void;
  clear: () => void;
}

const BuildContext = createContext<BuildContextValue | null>(null);

export function BuildProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) dispatch({ type: "RESTORE", state: JSON.parse(stored) as BuildState });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const alerts = useMemo(() => evaluateBuild(state.components), [state.components]);
  const value = useMemo<BuildContextValue>(() => ({
    ...state,
    hydrated,
    alerts,
    overallStatus: getOverallStatus(alerts),
    estimatedWatts: calculateEstimatedWatts(state.components),
    recommendedPsuWatts: calculateRecommendedPsuWatts(state.components),
    total: calculateBuildTotal(state.components, state.offers),
    selectComponent: (component) => dispatch({ type: "SELECT_COMPONENT", component }),
    selectOffer: (category, offer) => dispatch({ type: "SELECT_OFFER", category, offer }),
    setStep: (step) => dispatch({ type: "SET_STEP", step }),
    clear: () => dispatch({ type: "CLEAR" })
  }), [state, hydrated, alerts]);

  return <BuildContext.Provider value={value}>{children}</BuildContext.Provider>;
}

export function useBuild() {
  const context = useContext(BuildContext);
  if (!context) throw new Error("useBuild precisa ser usado dentro de BuildProvider.");
  return context;
}

export function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
