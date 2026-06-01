"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { Wallet, ChevronUp, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/currency-context";
import { formatAmount } from "@/lib/app-utils";
import { getStablecoinTokens, type StablecoinSymbol } from "@/lib/stablecoin-tokens";
import {
  formatDisplayCurrency,
  tokenAmountToDisplay,
  type CurrencyRates,
} from "@/lib/currency-conversion";

import usdcIcon from "@/assets/usdc.png";
import usdmIcon from "@/assets/usdm.png";
import usdtIcon from "@/assets/usdt.png";

const tokenIcons = {
  USDm: usdmIcon,
  USDC: usdcIcon,
  USDT: usdtIcon,
};

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface TokenBalance {
  symbol: StablecoinSymbol;
  amount: number;
}

function AssetTokenCard({
  symbol,
  balance,
  isLoading,
  displayCurrency,
  rates,
}: {
  symbol: StablecoinSymbol;
  balance: number;
  isLoading: boolean;
  displayCurrency: "USD" | "IDR";
  rates: CurrencyRates;
}) {
  const fiatValue = tokenAmountToDisplay(balance, symbol, displayCurrency, rates);

  return (
    <div className="relative bg-white rounded-2xl p-4 pt-8 shadow-sm h-full border border-white/60">
      {/* Coin icon floating at top-left */}
      <div className="absolute -top-3 left-4 h-10 w-10 rounded-full flex items-center justify-center shadow-md border-2 border-white overflow-hidden bg-white">
        <Image
          src={tokenIcons[symbol]}
          alt={symbol}
          width={40}
          height={40}
          className="h-full w-full object-cover"
        />
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">
        {isLoading ? "—" : formatAmount(balance)}
      </p>
      <p className="text-xs text-gray-500 font-semibold mt-0.5">{symbol}</p>
      {!isLoading && (
        <p className="text-[11px] text-gray-400 mt-1">
          ≈{" "}
          {displayCurrency === "IDR"
            ? `Rp ${formatDisplayCurrency(fiatValue, "IDR")}`
            : `$${formatDisplayCurrency(fiatValue, "USD")}`}
        </p>
      )}
    </div>
  );
}

export function UserBalance() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const {
    currency,
    rates,
    ratesLoading,
    toggleCurrency,
    formatInDisplayCurrency,
  } = useCurrency();

  const chainId = chain?.id || 42220;
  const tokens = getStablecoinTokens(chainId);

  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [assetsExpanded, setAssetsExpanded] = useState(true);

  const fetchBalances = useCallback(async () => {
    if (!isConnected || !address || !publicClient) return;

    setLoading(true);
    try {
      const results = await Promise.all(
        tokens.map(async (token) => {
          try {
            const raw = await publicClient.readContract({
              address: token.address,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address],
            });
            return {
              symbol: token.symbol,
              amount: parseFloat(formatUnits(raw as bigint, token.decimals)),
            };
          } catch {
            return { symbol: token.symbol, amount: 0 };
          }
        })
      );
      setTokenBalances(results);
    } catch (e) {
      console.error("Failed to fetch balances", e);
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, publicClient, tokens]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Compute total balance in display currency
  const totalDisplayBalance = tokenBalances.reduce((sum, tb) => {
    return sum + tokenAmountToDisplay(tb.amount, tb.symbol, currency, rates);
  }, 0);

  const balanceLoading = loading || ratesLoading;

  if (!isConnected || !address) {
    return (
      <Card className="border border-border bg-white shadow-none">
        <CardContent className="p-6 text-center space-y-2">
          <Coins className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-foreground">Wallet Disconnected</h3>
          <p className="text-xs text-muted-foreground">
            Connect your Celo MiniPay wallet to view your balance and automate scheduled remittances.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative animate-in fade-in duration-300">
      {/* Decorative background glow */}
      <div className="absolute -right-4 -top-4 h-24 w-24 bg-white/10 rounded-full blur-2xl" />

      <CardContent className="p-6 relative">
        {/* Header: Total Balance + wallet icon */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium opacity-80 tracking-wider">Total Balance</p>
              <button
                onClick={toggleCurrency}
                className="px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-extrabold hover:bg-white/30 active:scale-95 transition-all text-white border border-white/10 uppercase select-none tracking-wider"
                title="Switch Currency"
              >
                {currency === "USD" ? "IDR ⇄" : "USD ⇄"}
              </button>
            </div>
            <div
              className="flex items-baseline gap-1 mt-1 cursor-pointer select-none active:scale-98 transition-transform"
              title="Click to toggle currency"
              onClick={toggleCurrency}
            >
              {currency === "IDR" ? (
                <>
                  <span className="text-sm font-medium opacity-80 mr-0.5">Rp</span>
                  <span className="text-3xl font-bold">
                    {balanceLoading ? "---" : formatDisplayCurrency(totalDisplayBalance, "IDR")}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold">
                    {balanceLoading ? "---" : formatDisplayCurrency(totalDisplayBalance, "USD")}
                  </span>
                  <span className="text-sm font-medium opacity-80">USD</span>
                </>
              )}
            </div>
          </div>
          <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Send & Receive Buttons */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 font-bold bg-white text-primary hover:bg-white/90"
            onClick={() => {
              // Navigate to send/create page
              window.location.href = "/create";
            }}
          >
            Send
          </Button>
          <Button
            variant="outline"
            className="flex-1 font-bold border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white"
            onClick={() => {
              // Could be extended with a receive sheet later
            }}
          >
            Receive
          </Button>
        </div>

        {/* Divider */}
        <div className="border-t border-white/25 mt-4" />

        {/* Token Cards Grid with expand/collapse */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            assetsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-2 gap-2.5 pt-6 pb-1">
              {tokens.map((token) => {
                const tb = tokenBalances.find((b) => b.symbol === token.symbol);
                return (
                  <div key={token.symbol} className="h-full">
                    <AssetTokenCard
                      symbol={token.symbol}
                      balance={tb?.amount ?? 0}
                      isLoading={balanceLoading}
                      displayCurrency={currency}
                      rates={rates}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chevron toggle */}
        <div className="flex justify-center -mb-6 mt-3">
          <button
            type="button"
            onClick={() => setAssetsExpanded((prev) => !prev)}
            className="h-5 w-10 rounded-t-full bg-primary-foreground/15 hover:bg-primary-foreground/25 flex items-center justify-center transition-colors active:scale-95"
            aria-expanded={assetsExpanded}
            aria-label={assetsExpanded ? "Collapse assets" : "Expand assets"}
          >
            <ChevronUp
              className={`h-3.5 w-3.5 text-white transition-transform duration-300 ${
                assetsExpanded ? "" : "rotate-180"
              }`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
