"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/context/toast-context";
import { formatAmount } from "@/lib/app-utils";
import { getStablecoinTokens } from "@/lib/stablecoin-tokens";
import { ArrowUpDown, ChevronDown, Send, Search, Copy, Check, X, Loader2, History, User } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

const ERC20_TRANSFER_ABI = [
  {
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

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

interface ContactItem {
  phoneNumber: string;
  prefix: string;
  address?: string;
  name?: string;
}



export function SwapWidget({ onTransferSuccess }: { onTransferSuccess?: () => void }) {
  const { showToast } = useToast();
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [sellAmount, setSellAmount] = useState<string>("");
  const [sellToken, setSellToken] = useState<StablecoinSymbol>("USDm");
  const [buyToken, setBuyToken] = useState<StablecoinSymbol | "">("USDm");
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [selectedPrefix, setSelectedPrefix] = useState<string>("+62");
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<"top" | "bottom">("bottom");

  const [contactHistory, setContactHistory] = useState<ContactItem[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  const [isResolvingPhone, setIsResolvingPhone] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [phoneResolutionStatus, setPhoneResolutionStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [showSellDropdown, setShowSellDropdown] = useState(false);
  const [showBuyDropdown, setShowBuyDropdown] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isContactSupported, setIsContactSupported] = useState(false);

  const sellDropdownRef = useRef<HTMLDivElement>(null);
  const buyDropdownRef = useRef<HTMLDivElement>(null);
  const phoneDropdownRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  // Check if Web Contact Picker API is supported
  useEffect(() => {
    if (typeof window !== "undefined" && (navigator as any).contacts && typeof (navigator as any).contacts.select === "function") {
      setIsContactSupported(true);
    }
  }, []);

  const handlePickContact = async () => {
    if (typeof window === "undefined" || !(navigator as any).contacts || typeof (navigator as any).contacts.select !== "function") {
      setPhoneResolutionStatus({
        type: "error",
        message: "Contact Picker is not supported on this device/browser.",
      });
      return;
    }
    try {
      // @ts-ignore
      const contacts = await navigator.contacts.select(["tel", "name"], { multiple: false });
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        let rawPhone = (contact.tel && contact.tel[0]) || "";
        if (rawPhone) {
          // Clean phone number format
          let cleaned = rawPhone.trim().replace(/[^\d+]/g, ""); // Keep digits and plus signs
          
          // Check if it starts with any of our country codes
          let prefixFound = false;
          // Sort country list descending by code length to match longest prefix first (+62 before +6)
          const sortedCountries = [...countries].sort((a, b) => b.code.length - a.code.length);
          for (const c of sortedCountries) {
            if (cleaned.startsWith(c.code)) {
              setSelectedPrefix(c.code);
              cleaned = cleaned.substring(c.code.length);
              prefixFound = true;
              break;
            }
          }

          if (cleaned.startsWith("0")) {
            cleaned = cleaned.substring(1);
          }

          // Clean up spaces/hyphens for formatting
          cleaned = cleaned.replace(/[^\d]/g, "");
          setPhoneNumber(cleaned);

          // Clear previous resolution status
          setResolvedAddress("");
          setPhoneResolutionStatus(null);
        }
      }
    } catch (err: any) {
      console.error("Error choosing from contact list:", err);
      setPhoneResolutionStatus({
        type: "error",
        message: `Failed to open contacts: ${err?.message || String(err)}`,
      });
    }
  };

  // Load contact history on mount
  useEffect(() => {
    const saved = localStorage.getItem("sendease_contact_history");
    if (saved) {
      try {
        setContactHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

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
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
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
      return;
    }
    const tempToken = sellToken;
    setSellToken(buyToken);
    setBuyToken(tempToken);
    setSellAmount(""); // Reset amount to prevent mismatch with new token's balance
  };

  const resolvePhoneAddress = async (phone: string) => {
    setIsResolvingPhone(true);
    setResolvedAddress("");
    setPhoneResolutionStatus(null);

    try {
      const res = await fetch("/api/agent/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone, chainId }),
      });
      const data = await res.json();
      if (data.walletAddress) {
        setResolvedAddress(data.walletAddress);
        setPhoneResolutionStatus({
          type: "success",
          message: `Wallet found: ${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}`,
        });
      } else if (data.error === "ODIS_QUOTA_EMPTY") {
        setPhoneResolutionStatus({
          type: "error",
          message: "Phone lookup unavailable. Please enter wallet address manually.",
        });
      } else {
        setPhoneResolutionStatus({
          type: "error",
          message: "No registered wallet found for this number.",
        });
      }
    } catch (e) {
      console.error(e);
      setPhoneResolutionStatus({
        type: "error",
        message: "Failed to perform phone lookup.",
      });
    } finally {
      setIsResolvingPhone(false);
    }
  };

  // Debounce phone lookup as user types
  useEffect(() => {
    let cleanedNumber = phoneNumber.trim().replace(/[^\d]/g, "");
    if (cleanedNumber.startsWith("0")) {
      cleanedNumber = cleanedNumber.substring(1);
    }
    if (!cleanedNumber || cleanedNumber.length < 3) {
      return;
    }
    const fullPhoneNumber = `${selectedPrefix}${cleanedNumber}`;

    const delayDebounceFn = setTimeout(() => {
      resolvePhoneAddress(fullPhoneNumber);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [phoneNumber, selectedPrefix]);

  const handleSelectContact = (contact: ContactItem) => {
    setSelectedPrefix(contact.prefix);
    setPhoneNumber(contact.phoneNumber);
    if (contact.address) {
      setResolvedAddress(contact.address);
      setPhoneResolutionStatus({
        type: "success",
        message: `Wallet found: ${contact.address.slice(0, 6)}...${contact.address.slice(-4)}`,
      });
    } else {
      setResolvedAddress("");
      setPhoneResolutionStatus(null);
      resolvePhoneAddress(`${contact.prefix}${contact.phoneNumber}`);
    }
    setShowHistoryDropdown(false);
  };

  const handlePhoneLookup = async () => {
    let cleanedNumber = phoneNumber.trim().replace(/[^\d]/g, "");
    if (cleanedNumber.startsWith("0")) {
      cleanedNumber = cleanedNumber.substring(1);
    }
    if (!cleanedNumber) {
      showToast("Please enter a valid phone number", "error");
      return;
    }
    const fullPhoneNumber = `${selectedPrefix}${cleanedNumber}`;
    resolvePhoneAddress(fullPhoneNumber);
  };

  const handleAction = async () => {
    if (!isConnected || !address || !walletClient || !publicClient) {
      showToast("Please connect your wallet first", "error");
      return;
    }
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

    if (!resolvedAddress) {
      showToast("Recipient wallet address is not resolved yet", "error");
      return;
    }

    const fullPhoneNumber = `${selectedPrefix}${cleanedNumber}`;
    const destinationDesc = `${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)} (${fullPhoneNumber})`;

    setIsTransferring(true);

    try {
      const tokens = getStablecoinTokens(chainId);
      const token = tokens.find((t) => t.symbol === sellToken);
      if (!token) {
        showToast("Invalid sell token", "error");
        setIsTransferring(false);
        return;
      }

      const amountWei = parseUnits(sellAmount, token.decimals);

      const txHash = await walletClient.writeContract({
        address: token.address,
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [resolvedAddress as `0x${string}`, amountWei],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Save to recent activities in localstorage
      const localActivity = {
        recipient: fullPhoneNumber,
        amount: parseFloat(sellAmount),
        timestamp: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        txHash: txHash,
        tokenSymbol: sellToken,
      };

      const savedActivities = localStorage.getItem("sendease_recent_activities");
      let activitiesList: any[] = [];
      if (savedActivities) {
        try {
          activitiesList = JSON.parse(savedActivities);
        } catch (e) {
          console.error(e);
        }
      }
      activitiesList.unshift(localActivity);
      localStorage.setItem("sendease_recent_activities", JSON.stringify(activitiesList.slice(0, 20)));
      
      // Save contact to history
      const savedContacts = localStorage.getItem("sendease_contact_history");
      let currentHistory: ContactItem[] = [];
      if (savedContacts) {
        try {
          currentHistory = JSON.parse(savedContacts);
        } catch (e) {
          console.error(e);
        }
      }
      const existingContact = currentHistory.find(
        (c) => c.phoneNumber === cleanedNumber && c.prefix === selectedPrefix
      );
      
      const filtered = currentHistory.filter(
        (c) => !(c.phoneNumber === cleanedNumber && c.prefix === selectedPrefix)
      );

      const newHistory = [
        {
          name: existingContact?.name,
          phoneNumber: cleanedNumber,
          prefix: selectedPrefix,
          address: resolvedAddress,
        },
        ...filtered,
      ].slice(0, 10);
      localStorage.setItem("sendease_contact_history", JSON.stringify(newHistory));
      setContactHistory(newHistory);

      setSellAmount("");
      setPhoneNumber("");
      setResolvedAddress("");
      setPhoneResolutionStatus(null);
      
      if (onTransferSuccess) {
        onTransferSuccess();
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Transfer failed. Please try again.", "error");
    } finally {
      setIsTransferring(false);
    }
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
              <div className={`absolute left-0 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in duration-150 flex flex-col max-h-60 ${dropdownPosition === "top"
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
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-left hover:bg-slate-50 transition-colors ${selectedPrefix === c.code ? "bg-slate-100/70 font-semibold text-slate-900" : "text-slate-600"
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
              // Clear resolution when phone number changes
              if (resolvedAddress || phoneResolutionStatus) {
                setResolvedAddress("");
                setPhoneResolutionStatus(null);
              }
            }}
            className="bg-transparent border-none outline-none text-sm font-semibold p-0 text-slate-900 placeholder-slate-300 w-full focus:ring-0"
          />

          {isResolvingPhone ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#09955F] shrink-0" />
          ) : (
            phoneNumber.replace(/[^\d]/g, "").length >= 5 && (
              <button
                type="button"
                onClick={handlePhoneLookup}
                className="p-1 hover:bg-slate-100 rounded-lg text-[#09955F] transition-all shrink-0"
                title="Lookup phone number"
              >
                <Search className="w-4 h-4" />
              </button>
            )
          )}

          <button
            type="button"
            onClick={handlePickContact}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#09955F] transition-all shrink-0"
            title="Select from Contacts"
          >
            <User className="w-4.5 h-4.5" />
          </button>

          {/* Contact History Dropdown */}
          {contactHistory.length > 0 && (
            <div className="relative shrink-0" ref={historyDropdownRef}>
              <button
                type="button"
                onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#09955F] transition-all shrink-0"
                title="Contact History"
              >
                <History className="w-4.5 h-4.5" />
              </button>

              {showHistoryDropdown && (
                <div className={`absolute right-0 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in duration-150 flex flex-col max-h-60 ${dropdownPosition === "top"
                  ? "bottom-full mb-2 origin-bottom slide-in-from-bottom-2"
                  : "mt-3 origin-top slide-in-from-top-2"
                  }`}>
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider">
                    Recent contacts
                  </div>
                  <div className="overflow-y-auto flex-1 mt-1">
                    {contactHistory.map((c, idx) => {
                      const country = countries.find((co) => co.code === c.prefix);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectContact(c)}
                          className="flex flex-col w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none"
                        >
                          {c.name && (
                            <span className="text-xs font-bold text-slate-800 mb-0.5">
                              {c.name}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <span>{country?.flag || "🏳️"}</span>
                            <span>{c.prefix} {c.phoneNumber}</span>
                          </div>
                          {c.address && (
                            <span className="text-[10px] font-mono text-slate-400 truncate mt-0.5 w-full">
                              {c.address}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {phoneResolutionStatus && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className={`text-xs font-semibold ${phoneResolutionStatus.type === "success" ? "text-[#09955F]" : "text-rose-500"
              }`}>
              {phoneResolutionStatus.message}
            </div>
            {phoneResolutionStatus.type === "success" && resolvedAddress && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resolvedAddress);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-[#09955F] transition-all shrink-0"
                title="Copy address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#09955F]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}
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

