"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/context/toast-context";
import { formatAmount } from "@/lib/app-utils";
import { getStablecoinTokens } from "@/lib/stablecoin-tokens";
import { ArrowUpDown, ChevronDown, Send, Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import usdcIcon from "@/assets/usdc.png";
import usdmIcon from "@/assets/usdm.png";
import usdtIcon from "@/assets/usdt.png";

import { countries } from "@/constants/countries";

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
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [selectedPrefix, setSelectedPrefix] = useState<string>("+62");
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<"top" | "bottom">("bottom");

  const [showSellDropdown, setShowSellDropdown] = useState(false);
  const [showBuyDropdown, setShowBuyDropdown] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [rotation, setRotation] = useState(0);

  const sellDropdownRef = useRef<HTMLDivElement>(null);
  const buyDropdownRef = useRef<HTMLDivElement>(null);
  const phoneDropdownRef = useRef<HTMLDivElement>(null);
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
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
        setShowPhoneDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Dynamic positioning logic for phone prefix dropdown
  useEffect(() => {
    function updateDropdownPosition() {
      if (phoneDropdownRef.current) {
        const rect = phoneDropdownRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const dropdownHeight = 240; // Max height of dropdown (max-h-60)
        const spaceBelow = windowHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
          setDropdownPosition("top");
        } else {
          setDropdownPosition("bottom");
        }
      }
    }

    if (showPhoneDropdown) {
      updateDropdownPosition();
      // Scroll listener on capture phase to detect scrolls in parent scrollable views
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
    }
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [showPhoneDropdown]);

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
    
    let cleanedNumber = phoneNumber.trim().replace(/[^\d]/g, "");
    if (cleanedNumber.startsWith("0")) {
      cleanedNumber = cleanedNumber.substring(1);
    }
    if (!cleanedNumber) {
      showToast("Please enter a contact number", "error");
      return;
    }
    
    const fullPhoneNumber = `${selectedPrefix}${cleanedNumber}`;

    setIsTransferring(true);
    showToast(`Initiating transfer: ${sellAmount} ${sellToken} to ${buyToken} (${fullPhoneNumber})...`, "success");

    setTimeout(() => {
      setIsTransferring(false);
      showToast(`Successfully transferred ${sellAmount} ${sellToken} to ${buyToken}!`, "success");
      setSellAmount("");
      setPhoneNumber("");
    }, 2000);
  };

  const filteredCountries = countries.filter(
    (c) =>
      c.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.includes(countrySearch)
  );

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
            <ArrowUpDown className="w-5 h-5" />
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

      {/* Contact Number Input */}
      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col h-fit relative">
        <label className="text-xs font-bold text-slate-400 tracking-wider mb-2">Recipient Contact Number</label>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs relative">
          {/* Prefix Selector Dropdown */}
          <div className="relative shrink-0" ref={phoneDropdownRef}>
            <button
              type="button"
              onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
              className="flex items-center gap-1 hover:bg-slate-50 active:scale-95 transition-all text-sm font-bold text-slate-800 pr-2 border-r border-slate-200"
            >
              <span>{countries.find((c) => c.code === selectedPrefix)?.flag || "🏳️"}</span>
              <span>{selectedPrefix}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showPhoneDropdown && (
              <div className={`absolute left-0 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in duration-150 flex flex-col max-h-60 ${
                dropdownPosition === "top"
                  ? "bottom-full mb-2 origin-bottom slide-in-from-bottom-2"
                  : "mt-3 origin-top slide-in-from-top-2"
              }`}>
                {/* Search country */}
                <div className="px-2 pb-1.5 border-b border-slate-100 flex items-center gap-1">
                  <Search className="w-3 h-3 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search country..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="w-full text-xs border-none outline-none p-0 focus:ring-0 placeholder-slate-300 text-slate-700"
                  />
                </div>
                
                <div className="overflow-y-auto flex-1 mt-1">
                  {filteredCountries.map((c) => (
                    <button
                      key={`${c.code}-${c.country}`}
                      type="button"
                      onClick={() => {
                        setSelectedPrefix(c.code);
                        setShowPhoneDropdown(false);
                        setCountrySearch("");
                      }}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-left hover:bg-slate-50 transition-colors ${
                        selectedPrefix === c.code ? "bg-slate-100/70 font-semibold text-slate-900" : "text-slate-600"
                      }`}
                    >
                      <span className="text-xs flex items-center gap-1.5">
                        <span>{c.flag}</span>
                        <span className="truncate max-w-[100px]">{c.country}</span>
                      </span>
                      <span className="text-xs font-bold text-slate-400">{c.code}</span>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-2">No countries found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <input
            type="tel"
            placeholder="8123456789"
            value={phoneNumber}
            onChange={(e) => {
              // Only allow digits, spaces, hyphens
              const val = e.target.value.replace(/[^\d\s\-]/g, "");
              setPhoneNumber(val);
            }}
            className="bg-transparent border-none outline-none text-sm font-semibold p-0 text-slate-900 placeholder-slate-300 w-full focus:ring-0"
          />
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

