"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { Coins, RefreshCw, PlusCircle, Check, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/context/currency-context";
import { useToast } from "@/context/toast-context";
import { formatAmount } from "@/lib/app-utils";
import { getStablecoinTokens } from "@/lib/stablecoin-tokens";

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function UserBalance() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { currency, convertStableUsdToDisplay, formatInDisplayCurrency, toggleCurrency } = useCurrency();
  const { showToast } = useToast();

  const [usdmBalance, setUsdmBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [copied, setCopied] = useState(false);

  const chainId = chain?.id || 42220;
  const isTestnet = chainId === 11142220 || chainId === 44787; // Sepolia or Alfajores
  
  const tokens = getStablecoinTokens(chainId);
  const usdmToken = tokens.find((t) => t.symbol === "USDm") || tokens[1];

  const fetchBalance = useCallback(async () => {
    if (!isConnected || !address || !publicClient || !usdmToken) return;

    setLoading(true);
    try {
      const balance = await publicClient.readContract({
        address: usdmToken.address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      setUsdmBalance(parseFloat(formatUnits(balance, usdmToken.decimals)));
    } catch (e) {
      console.error("Failed to fetch USDm balance", e);
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, publicClient, usdmToken]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleMintMock = async () => {
    if (!isConnected || !address || !walletClient || !publicClient || !usdmToken) {
      showToast("Please connect your wallet first", "error");
      return;
    }

    setMinting(true);
    try {
      const mintAmount = parseUnits("100", usdmToken.decimals);
      
      const hash = await walletClient.writeContract({
        address: usdmToken.address,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [address, mintAmount],
      });

      showToast("Mint transaction submitted...", "success");
      await publicClient.waitForTransactionReceipt({ hash });
      showToast("Successfully minted 100 mock USDm!", "success");
      await fetchBalance();
    } catch (e: any) {
      console.error("Mint failed", e);
      showToast(e.message || "Mint transaction failed", "error");
    } finally {
      setMinting(false);
    }
  };

  const displayVal = convertStableUsdToDisplay(usdmBalance, "USDm");

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Wallet address copied!", "success");
    }
  };

  if (!isConnected) {
    return (
      <Card className="border border-border bg-white shadow-none">
        <CardContent className="p-6 text-center space-y-2">
          <Coins className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-foreground">Wallet Disconnected</h3>
          <p className="text-xs text-muted-foreground">Connect your Celo MiniPay wallet to view your balance and automate scheduled remittances.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#09955F] text-white border-none rounded-2xl shadow-none">
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-xs text-white/80 font-semibold tracking-wider uppercase">Your USDm Balance</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">
                {currency === "IDR" ? "Rp " : ""}
                {formatInDisplayCurrency(displayVal)}
              </span>
              <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase">
                {currency}
              </span>
            </div>
            {currency === "IDR" && (
              <p className="text-xs text-white/70">
                ≈ {formatAmount(usdmBalance)} USDm
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleCurrency}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 transition-all border border-white/10"
              title="Toggle Currency"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={fetchBalance}
              disabled={loading}
              className={`p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 transition-all border border-white/10 ${loading ? "animate-spin" : ""}`}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-white/10 text-xs">
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-white/80" onClick={copyAddress}>
            <span className="font-mono text-white/80">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
          </div>

          {isTestnet && (
            <button
              onClick={handleMintMock}
              disabled={minting}
              className="flex items-center gap-1.5 bg-white text-[#09955F] font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              {minting ? "Minting..." : "Faucet"}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
