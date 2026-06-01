"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { Wallet, ChevronUp, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatAmount } from "@/lib/app-utils";
import { getStablecoinTokens, type StablecoinSymbol } from "@/lib/stablecoin-tokens";

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
}: {
  symbol: StablecoinSymbol;
  balance: number;
  isLoading: boolean;
}) {
  return (
    <div className="relative bg-slate-50/70 rounded-2xl p-4 pt-6 shadow-xs h-full border border-slate-100">
      {/* Coin icon floating at top-left - smaller size */}
      <div className="absolute -top-2 left-4 h-7 w-7 rounded-full flex items-center justify-center shadow-xs border border-slate-200/80 overflow-hidden bg-white">
        <Image
          src={tokenIcons[symbol]}
          alt={symbol}
          width={28}
          height={28}
          className="h-full w-full object-cover"
        />
      </div>
      <p className="text-lg font-bold text-slate-800 leading-tight">
        {isLoading ? "—" : formatAmount(balance)}
      </p>
      <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-wider">{symbol}</p>
      {!isLoading && (
        <p className="text-[11px] text-slate-400 mt-1 font-medium">
          ≈ ${formatAmount(balance)} USD
        </p>
      )}
    </div>
  );
}

export function UserBalance() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();

  const chainId = chain?.id || 42220;
  const tokens = getStablecoinTokens(chainId);

  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [assetsExpanded, setAssetsExpanded] = useState(false);

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

  // Compute total USD balance (all stablecoins are ~1 USD each)
  const totalUsdBalance = tokenBalances.reduce((sum, tb) => sum + tb.amount, 0);

  if (!isConnected || !address) {
    return (
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm text-center space-y-3 text-slate-900">
        <Coins className="h-10 w-10 text-slate-400 mx-auto" />
        <h3 className="font-bold text-slate-800">Wallet Disconnected</h3>
        <p className="text-xs text-slate-400">
          Connect your Celo MiniPay wallet to view your balance and automate scheduled remittances.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm text-slate-900 relative animate-in fade-in duration-300">
      {/* Total Balance Panel */}
      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between h-[100px]">
        <div className="flex justify-between items-center w-full">
          <span className="text-xs font-bold text-slate-400 tracking-wider">Total Balance</span>
          <div className="p-1.5 rounded-full bg-white border border-slate-200/60 shadow-xs text-slate-400">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="flex flex-col mt-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              {loading ? "---" : formatAmount(totalUsdBalance)}
            </span>
            <span className="text-xs font-bold text-slate-400">USD</span>
          </div>
        </div>
      </div>

      {/* Token Cards Grid with expand/collapse */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          assetsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-3 pt-4 pb-1">
            {tokens.map((token) => {
              const tb = tokenBalances.find((b) => b.symbol === token.symbol);
              return (
                <div key={token.symbol} className="h-full">
                  <AssetTokenCard
                    symbol={token.symbol}
                    balance={tb?.amount ?? 0}
                    isLoading={loading}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chevron toggle */}
      <div className="flex justify-center -mb-4 mt-2">
        <button
          type="button"
          onClick={() => setAssetsExpanded((prev) => !prev)}
          className="h-5 w-10 rounded-t-full bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center transition-colors active:scale-95 border-t border-x border-slate-200/40"
          aria-expanded={assetsExpanded}
          aria-label={assetsExpanded ? "Collapse assets" : "Expand assets"}
        >
          <ChevronUp
            className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-300 ${
              assetsExpanded ? "" : "rotate-180"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
