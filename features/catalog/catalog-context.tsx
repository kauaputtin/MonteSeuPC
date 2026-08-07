"use client";

import { createContext, useContext } from "react";
import type { CatalogData } from "@/types/domain";

const CatalogContext = createContext<CatalogData | null>(null);

export function CatalogProvider({ catalog, children }: { catalog: CatalogData; children: React.ReactNode }) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalog precisa ser usado dentro de CatalogProvider.");
  return value;
}
