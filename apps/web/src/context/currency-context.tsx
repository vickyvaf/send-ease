"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { formatAmount } from "@/lib/app-utils";
import type { StablecoinSymbol } from "@/lib/stablecoin-tokens";

interface CurrencyContextType {
  currency: "USD";
  formatInDisplayCurrency: (amount: number) => string;
  /** @deprecated No-op: always returns amount as-is (USD only) */
  convertStableUsdToDisplay: (usdStableAmount: number, symbol?: StablecoinSymbol) => number;
  /** @deprecated No-op: always returns amount as-is (USD only) */
  convertDisplayToStableUsd: (displayAmount: number, symbol?: StablecoinSymbol) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const formatInDisplayCurrency = useCallback((amount: number) => formatAmount(amount), []);
  const convertStableUsdToDisplay = useCallback((amount: number) => amount, []);
  const convertDisplayToStableUsd = useCallback((amount: number) => amount, []);

  const value = useMemo(
    () => ({
      currency: "USD" as const,
      formatInDisplayCurrency,
      convertStableUsdToDisplay,
      convertDisplayToStableUsd,
    }),
    [formatInDisplayCurrency, convertStableUsdToDisplay, convertDisplayToStableUsd]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
