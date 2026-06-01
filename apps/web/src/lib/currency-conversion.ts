import type { StablecoinSymbol } from "@/lib/stablecoin-tokens";

export type DisplayCurrency = "USD" | "IDR";

export interface TokenRates {
  usd: number;
  idr: number;
}

export type CurrencyRates = Record<StablecoinSymbol, TokenRates>;

export const COINGECKO_TOKEN_IDS: Record<StablecoinSymbol, string> = {
  USDm: "celo-dollar",
  USDC: "usd-coin",
  USDT: "tether",
};

const DEFAULT_IDR = 16_000;

export const FALLBACK_CURRENCY_RATES: CurrencyRates = {
  USDm: { usd: 1, idr: DEFAULT_IDR },
  USDC: { usd: 1, idr: DEFAULT_IDR },
  USDT: { usd: 1, idr: DEFAULT_IDR },
};

export function buildCurrencyRatesFromCoingecko(
  data: Record<string, { usd?: number; idr?: number }>
): CurrencyRates {
  const resolve = (id: string): TokenRates => {
    const entry = data[id];
    const usd = entry?.usd ?? 1;
    const idr =
      entry?.idr ??
      (entry?.usd ? entry.usd * DEFAULT_IDR : DEFAULT_IDR);
    return { usd, idr };
  };

  return {
    USDm: resolve(COINGECKO_TOKEN_IDS.USDm),
    USDC: resolve(COINGECKO_TOKEN_IDS.USDC),
    USDT: resolve(COINGECKO_TOKEN_IDS.USDT),
  };
}

export function getTokenRates(
  rates: CurrencyRates,
  symbol: StablecoinSymbol
): TokenRates {
  return rates[symbol] ?? FALLBACK_CURRENCY_RATES[symbol];
}

export function tokenAmountToUsd(
  amount: number,
  symbol: StablecoinSymbol,
  rates: CurrencyRates
): number {
  if (!amount || amount <= 0) return 0;
  return amount * getTokenRates(rates, symbol).usd;
}

export function tokenAmountToIdr(
  amount: number,
  symbol: StablecoinSymbol,
  rates: CurrencyRates
): number {
  if (!amount || amount <= 0) return 0;
  return amount * getTokenRates(rates, symbol).idr;
}

export function tokenAmountToDisplay(
  amount: number,
  symbol: StablecoinSymbol,
  displayCurrency: DisplayCurrency,
  rates: CurrencyRates
): number {
  return displayCurrency === "IDR"
    ? tokenAmountToIdr(amount, symbol, rates)
    : tokenAmountToUsd(amount, symbol, rates);
}

export function stableUsdAmountToDisplay(
  usdStableAmount: number,
  displayCurrency: DisplayCurrency,
  rates: CurrencyRates,
  referenceSymbol: StablecoinSymbol = "USDm"
): number {
  if (displayCurrency === "USD") return usdStableAmount;
  return usdStableAmount * getTokenRates(rates, referenceSymbol).idr;
}

export function displayToStableUsdAmount(
  displayAmount: number,
  displayCurrency: DisplayCurrency,
  rates: CurrencyRates,
  referenceSymbol: StablecoinSymbol = "USDm"
): number {
  if (displayCurrency === "USD") return displayAmount;
  const idrPerUnit = getTokenRates(rates, referenceSymbol).idr;
  if (!idrPerUnit) return displayAmount;
  return displayAmount / idrPerUnit;
}

function fractionDigitsForSmallAmount(abs: number, cap = 6): number {
  if (abs >= 1) return 0;
  return Math.min(cap, Math.max(2, Math.ceil(-Math.log10(abs)) + 1));
}

export function formatIdr(amount: number): string {
  if (!amount || amount === 0) return "0";

  const abs = Math.abs(amount);
  let maximumFractionDigits = 0;

  if (abs < 1) {
    maximumFractionDigits = fractionDigitsForSmallAmount(abs);
  } else if (abs < 100) {
    maximumFractionDigits = 2;
  }

  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(amount);
}

export function formatUsdTotal(amount: number): string {
  if (!amount || amount === 0) return "0";

  const abs = Math.abs(amount);
  let maximumFractionDigits = 2;

  if (abs < 0.01) {
    maximumFractionDigits = fractionDigitsForSmallAmount(abs);
  } else if (abs < 1) {
    maximumFractionDigits = 4;
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(amount);
}

export function formatDisplayCurrency(
  amount: number,
  displayCurrency: DisplayCurrency
): string {
  if (displayCurrency === "IDR") return formatIdr(amount);
  return formatUsdTotal(amount);
}
