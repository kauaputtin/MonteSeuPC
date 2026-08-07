"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { calculateBuildTotal } from "@/lib/calculations";
import { useCatalog } from "@/features/catalog/catalog-context";
import type { PaymentPreference } from "@/lib/offers";
import { calculateEstimatedWatts, calculateRecommendedPsuWatts, evaluateBuild, getOverallStatus } from "@/lib/compatibility/compatibility-engine";
import type { CategorySlug, Component, Offer, SelectedComponents, SelectedOffers } from "@/types/domain";

const STORAGE_KEY = "monte-seu-pc:build:v1";

interface BuildState {
  currentStep: number;
  components: SelectedComponents;
  offers: SelectedOffers;
  paymentPreference: PaymentPreference;
}

type Action =
  | { type: "SELECT_COMPONENT"; component: Component }
  | { type: "SELECT_OFFER"; category: CategorySlug; offer: Offer }
  | { type: "SET_STEP"; step: number }
  | { type: "SET_PAYMENT"; preference: PaymentPreference }
  | { type: "RESTORE"; state: BuildState }
  | { type: "CLEAR" };

const initialState: BuildState = { currentStep: 0, components: {}, offers: {}, paymentPreference: "pix" };

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
    case "SET_PAYMENT": return { ...state, paymentPreference: action.preference };
    case "RESTORE": return { ...initialState, ...action.state, paymentPreference: action.state.paymentPreference ?? "pix" };
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
  setPaymentPreference: (preference: PaymentPreference) => void;
  clear: () => void;
}

const BuildContext = createContext<BuildContextValue | null>(null);

export function BuildProvider({ children }: { children: React.ReactNode }) {
  const catalog = useCatalog();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<BuildState>;
        const restoredComponents = Object.fromEntries(Object.entries(parsed.components ?? {}).flatMap(([category, saved]) => {
          const current = catalog.components.find((component) => component.id === saved?.id && component.categorySlug === category && component.active);
          return current ? [[category, current]] : [];
        })) as SelectedComponents;
        const restoredOffers = Object.fromEntries(Object.entries(parsed.offers ?? {}).flatMap(([category, saved]) => {
          const component = restoredComponents[category as CategorySlug];
          const current = catalog.offers.find((offer) => offer.id === saved?.id && offer.componentId === component?.id && offer.available && !offer.staleAt);
          return current ? [[category, current]] : [];
        })) as SelectedOffers;
        dispatch({ type: "RESTORE", state: { currentStep: parsed.currentStep ?? 0, components: restoredComponents, offers: restoredOffers, paymentPreference: parsed.paymentPreference ?? "pix" } });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, [catalog.components, catalog.offers]);

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
    total: calculateBuildTotal(state.components, state.offers, catalog.offers, state.paymentPreference),
    selectComponent: (component) => dispatch({ type: "SELECT_COMPONENT", component }),
    selectOffer: (category, offer) => dispatch({ type: "SELECT_OFFER", category, offer }),
    setStep: (step) => dispatch({ type: "SET_STEP", step }),
    setPaymentPreference: (preference) => dispatch({ type: "SET_PAYMENT", preference }),
    clear: () => dispatch({ type: "CLEAR" })
  }), [state, hydrated, alerts, catalog.offers]);

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
