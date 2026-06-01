"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ChevronDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/context/toast-context";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { getStablecoinTokens } from "@/lib/stablecoin-tokens";
import { formatAmount } from "@/lib/app-utils";

import usdcIcon from "@/assets/usdc.png";
import usdmIcon from "@/assets/usdm.png";
import usdtIcon from "@/assets/usdt.png";

type StablecoinSymbol = "USDm" | "USDC" | "USDT";

const tokenIcons = {
  USDm: usdmIcon,
  USDC: usdcIcon,
  USDT: usdtIcon,
};

export function SwapWidget() {
  const { showToast } = useToast();
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();

  const [sellAmount, setSellAmount] = useState<string>("");
  const [sellToken, setSellToken] = useState<StablecoinSymbol>("USDm");
  const [buyToken, setBuyToken] = useState<StablecoinSymbol | "">("USDm");
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  const [showSellDropdown, setShowSellDropdown] = useState(false);
  const [showBuyDropdown, setShowBuyDropdown] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [rotation, setRotation] = useState(0);

  const sellDropdownRef = useRef<HTMLDivElement>(null);
  const buyDropdownRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sellDropdownRef.current && !sellDropdownRef.current.contains(event.target as Node)) {
        setShowSellDropdown(false);
      }
      if (buyDropdownRef.current && !buyDropdownRef.current.contains(event.target as Node)) {
        setShowBuyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const chainId = chain?.id || 42220;

  // Reset initialized flag if address changes
  useEffect(() => {
    hasInitializedRef.current = false;
  }, [address]);

  // Fetch balances for all tokens to determine which one has the highest balance initially
  useEffect(() => {
    async function initDefaultToken() {
      if (!isConnected || !address || !publicClient || hasInitializedRef.current) return;
      try {
        const tokens = getStablecoinTokens(chainId);
        const balances = await Promise.all(
          tokens.map(async (token) => {
            try {
              const raw = await publicClient.readContract({
                address: token.address,
                abi: [
                  {
                    inputs: [{ name: "account", type: "address" }],
                    name: "balanceOf",
                    outputs: [{ name: "", type: "uint256" }],
                    stateMutability: "view",
                    type: "function",
                  },
                ] as const,
                functionName: "balanceOf",
                args: [address],
              });
              return {
                symbol: token.symbol,
                amount: parseFloat(formatUnits(raw as bigint, token.decimals)),
              };
            } catch (e) {
              return { symbol: token.symbol, amount: 0 };
            }
          })
        );

        if (balances.length > 0 && !hasInitializedRef.current) {
          const highest = balances.reduce((prev, current) => {
            return prev.amount >= current.amount ? prev : current;
          });
          setSellToken(highest.symbol);
          setTokenBalance(highest.amount);
          setBuyToken(highest.symbol === "USDm" ? "USDC" : "USDm");
          hasInitializedRef.current = true;
        }
      } catch (e) {
        console.error("Failed to determine default token with highest balance", e);
      }
    }
    initDefaultToken();
  }, [isConnected, address, publicClient, chainId]);

  // Fetch balance for the selected sell token
  useEffect(() => {
    async function fetchBalance() {
      if (!isConnected || !address || !publicClient) return;
      try {
        const tokens = getStablecoinTokens(chainId);
        const token = tokens.find((t) => t.symbol === sellToken);
        if (!token) return;

        const raw = await publicClient.readContract({
          address: token.address,
          abi: [
            {
              inputs: [{ name: "account", type: "address" }],
              name: "balanceOf",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            },
          ] as const,
          functionName: "balanceOf",
          args: [address],
        });
        setTokenBalance(parseFloat(formatUnits(raw as bigint, token.decimals)));
      } catch (e) {
        console.error("Failed to fetch balance in SwapWidget", e);
        setTokenBalance(0);
      }
    }
    fetchBalance();
  }, [sellToken, isConnected, address, publicClient, chainId]);

  const handleSwapTokens = () => {
    setRotation((prev) => prev + 180);
    if (!buyToken) {
      // If buy token is not selected yet, swap sellToken with default or just show warning
      showToast("Select a buy token first to swap directions!", "success");
      return;
    }
    const tempToken = sellToken;
    setSellToken(buyToken);
    setBuyToken(tempToken);
    setSellAmount(""); // Reset amount to prevent mismatch with new token's balance
  };

  const handleAction = () => {
    if (!buyToken) {
      showToast("Please select a token to buy", "error");
      return;
    }
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      showToast("Please enter an amount to transfer", "error");
      return;
    }

    setIsTransferring(true);
    showToast(`Initiating transfer: ${sellAmount} ${sellToken} to ${buyToken}...`, "success");

    setTimeout(() => {
      setIsTransferring(false);
      showToast(`Successfully transferred ${sellAmount} ${sellToken} to ${buyToken}!`, "success");
      setSellAmount("");
    }, 2000);
  };

  const tokensList: StablecoinSymbol[] = ["USDm", "USDC", "USDT"];

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3 text-slate-900">
      <div className="relative flex flex-col gap-3">
        {/* Sell Container */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col h-fit relative">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-bold text-slate-400 tracking-wider">Send</span>

            {/* Sell Token Selector */}
            <div className="relative" ref={sellDropdownRef}>
              <button
                onClick={() => setShowSellDropdown(!showSellDropdown)}
                className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all py-1.5 px-3 rounded-full shadow-xs"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white shrink-0 shadow-xs border border-slate-100">
                  <Image
                    src={tokenIcons[sellToken]}
                    alt={sellToken}
                    width={20}
                    height={20}
                    className="object-cover"
                  />
                </div>
                <span className="font-bold text-sm text-slate-800">{sellToken}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {showSellDropdown && (
                <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                  {tokensList.map((token) => (
                    <button
                      key={token}
                      onClick={() => {
                        if (token === buyToken) {
                          setBuyToken(sellToken);
                        }
                        setSellToken(token);
                        setSellAmount(""); // Reset amount to prevent mismatch
                        setShowSellDropdown(false);
                      }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors ${sellToken === token ? "bg-slate-100/70 font-semibold text-slate-900" : "text-slate-600"
                        }`}
                    >
                      <Image src={tokenIcons[token]} alt={token} width={18} height={18} />
                      <span className="text-sm">{token}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center flex-1 mt-1">
            <input
              type="text"
              inputMode="decimal"
              pattern="^[0-9]*[.,]?[0-9]*$"
              placeholder="0"
              value={sellAmount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                  setSellAmount(val);
                }
              }}
              className="bg-transparent border-none outline-none text-4xl font-bold p-0 text-slate-900 placeholder-slate-300 w-full focus:ring-0"
            />
            <span className="text-xs text-slate-400 mt-0.5 font-semibold">
              ${sellAmount ? parseFloat(sellAmount.replace(",", ".")) || 0 : 0}
            </span>
          </div>

          {/* Max Button & Balance Absolute at Bottom Right */}
          {isConnected && (
            <div className="absolute bottom-3 right-4 flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
              <span>Balance: {formatAmount(tokenBalance)}</span>
              <button
                type="button"
                onClick={() => setSellAmount(tokenBalance.toString())}
                className="bg-[#D1FAE5] text-[#09955F] hover:bg-[#bbf7d0] active:scale-95 transition-all px-2 py-0.5 rounded-md font-bold text-[10px]"
              >
                Max
              </button>
            </div>
          )}
        </div>

        {/* Overlapping Swap Button */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={handleSwapTokens}
            style={{ transform: `rotate(${rotation}deg)` }}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#09955F] hover:bg-slate-50 active:scale-95 transition-all duration-300 shadow-sm"
            aria-label="Swap directions"
          >
            <div className="flex items-center -space-x-1.5">
              <ArrowUp className="w-5 h-5 -translate-y-[2px]" />
              <ArrowDown className="w-5 h-5 translate-y-[2px]" />
            </div>
          </button>
        </div>

        {/* Buy Container */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col h-fit">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-bold text-slate-400 tracking-wider">Receive</span>

            {/* Buy Token Selector */}
            <div className="relative" ref={buyDropdownRef}>
              {buyToken ? (
                <button
                  onClick={() => setShowBuyDropdown(!showBuyDropdown)}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all py-1.5 px-3 rounded-full shadow-xs"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white shrink-0 shadow-xs border border-slate-100">
                    <Image
                      src={tokenIcons[buyToken]}
                      alt={buyToken}
                      width={20}
                      height={20}
                      className="object-cover"
                    />
                  </div>
                  <span className="font-bold text-sm text-slate-800">{buyToken}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ) : (
                <button
                  onClick={() => setShowBuyDropdown(!showBuyDropdown)}
                  className="flex items-center gap-1 bg-[#09955F] hover:bg-[#077f50] text-white font-bold text-sm py-1.5 px-3.5 rounded-full active:scale-95 transition-all shadow-xs shrink-0"
                >
                  Select token
                  <ChevronDown className="w-3.5 h-3.5 text-white/90 shrink-0" />
                </button>
              )}

              {showBuyDropdown && (
                <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                  {tokensList.map((token) => (
                    <button
                      key={token}
                      onClick={() => {
                        if (token === sellToken) {
                          setSellToken(buyToken || "USDm");
                          setSellAmount(""); // Reset amount because sell token changed
                        }
                        setBuyToken(token);
                        setShowBuyDropdown(false);
                      }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors ${buyToken === token ? "bg-slate-100/70 font-semibold text-slate-900" : "text-slate-600"
                        }`}
                    >
                      <Image src={tokenIcons[token]} alt={token} width={18} height={18} />
                      <span className="text-sm">{token}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center flex-1 mt-1">
            <span className="text-4xl font-bold text-slate-900 leading-tight">
              {sellAmount ? sellAmount : "0"}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 font-semibold">
              ${sellAmount ? parseFloat(sellAmount.replace(",", ".")) || 0 : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={handleAction}
        disabled={isTransferring}
        className="w-full h-10 rounded-xl bg-[#09955F] hover:bg-[#077f50] text-white transition-all font-bold text-sm active:scale-[0.99] flex items-center justify-center gap-2 mt-1 shadow-sm"
      >
        {isTransferring ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Transferring...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Transfer
          </>
        )}
      </Button>
    </div>
  );
}

