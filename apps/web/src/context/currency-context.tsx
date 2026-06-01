"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  buildCurrencyRatesFromCoingecko,
  COINGECKO_TOKEN_IDS,
  CurrencyRates,
  DisplayCurrency,
  FALLBACK_CURRENCY_RATES,
  formatDisplayCurrency,
  getTokenRates,
  stableUsdAmountToDisplay,
  tokenAmountToDisplay,
  displayToStableUsdAmount,
} from "@/lib/currency-conversion";
import type { StablecoinSymbol } from "@/lib/stablecoin-tokens";

type Currency = DisplayCurrency;

interface CurrencyContextType {
  currency: Currency;
  rate: number;
  rates: CurrencyRates;
  ratesLoading: boolean;
  setCurrency: (c: Currency) => void;
  toggleCurrency: () => void;
  getTokenRates: (symbol: StablecoinSymbol) => { usd: number; idr: number };
  convertTokenToDisplay: (amount: number, symbol: StablecoinSymbol) => number;
  convertStableUsdToDisplay: (usdStableAmount: number, symbol?: StablecoinSymbol) => number;
  convertDisplayToStableUsd: (displayAmount: number, symbol?: StablecoinSymbol) => number;
  formatInDisplayCurrency: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [rates, setRates] = useState<CurrencyRates>(FALLBACK_CURRENCY_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sendease_currency");
    if (saved === "IDR" || saved === "USD") {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("sendease_currency", c);
  };

  const toggleCurrency = () => {
    const next = currency === "USD" ? "IDR" : "USD";
    setCurrency(next);
  };

  useEffect(() => {
    async function fetchRates() {
      setRatesLoading(true);
      try {
        const ids = Object.values(COINGECKO_TOKEN_IDS).join(",");
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,idr`
        );
        if (res.ok) {
          const data = await res.json();
          setRates(buildCurrencyRatesFromCoingecko(data));
        }
      } catch (e) {
        console.error("Failed to fetch exchange rates, using fallback", e);
      } finally {
        setRatesLoading(false);
      }
    }
    fetchRates();
  }, []);

  const rate = rates.USDm.idr;

  const getTokenRatesForSymbol = useCallback(
    (symbol: StablecoinSymbol) => getTokenRates(rates, symbol),
    [rates]
  );

  const convertTokenToDisplay = useCallback(
    (amount: number, symbol: StablecoinSymbol) =>
      tokenAmountToDisplay(amount, symbol, currency, rates),
    [currency, rates]
  );

  const convertStableUsdToDisplay = useCallback(
    (usdStableAmount: number, symbol: StablecoinSymbol = "USDm") =>
      stableUsdAmountToDisplay(usdStableAmount, currency, rates, symbol),
    [currency, rates]
  );

  const convertDisplayToStableUsd = useCallback(
    (displayAmount: number, symbol: StablecoinSymbol = "USDm") =>
      displayToStableUsdAmount(displayAmount, currency, rates, symbol),
    [currency, rates]
  );

  const formatInDisplayCurrency = useCallback(
    (amount: number) => formatDisplayCurrency(amount, currency),
    [currency]
  );

  const value = useMemo(
    () => ({
      currency,
      rate,
      rates,
      ratesLoading,
      setCurrency,
      toggleCurrency,
      getTokenRates: getTokenRatesForSymbol,
      convertTokenToDisplay,
      convertStableUsdToDisplay,
      convertDisplayToStableUsd,
      formatInDisplayCurrency,
    }),
    [
      currency,
      rate,
      rates,
      ratesLoading,
      getTokenRatesForSymbol,
      convertTokenToDisplay,
      convertStableUsdToDisplay,
      convertDisplayToStableUsd,
      formatInDisplayCurrency,
    ]
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
