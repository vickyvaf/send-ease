"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { countries } from "@/constants/countries";
import { useToast } from "@/context/toast-context";
import { isValidAddress } from "@/lib/app-utils";
import { ArrowRight, Calendar, Check, CheckCircle2, ChevronDown, Copy, Loader2, Phone, Search, Share2, User, UserX, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function CreateRemittance() {
  const router = useRouter();
  const { showToast } = useToast();

  // Prompt/AI State
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Form Fields
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  const frequencyDropdownRef = useRef<HTMLDivElement>(null);

  // ODIS Phone Lookup State
  const [isResolvingPhone, setIsResolvingPhone] = useState(false);
  const [phoneResolutionStatus, setPhoneResolutionStatus] = useState<{
    type: "success" | "error" | "idle" | "not_found";
    message: string;
  }>({ type: "idle", message: "" });
  const [showManualAddress, setShowManualAddress] = useState(false);

  // Calendar State
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Country Prefix Selector state
  const [selectedPrefix, setSelectedPrefix] = useState<string>("+62");
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const phoneDropdownRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const isRestoredRef = useRef(false);

  const getInviteLink = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}?ref=invite`;
  };

  const handleCopyInvite = async () => {
    const link = getInviteLink();
    try {
      await navigator.clipboard.writeText(link);
      showToast("Invite link copied!", "success");
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  const handlePhoneLookup = async (phone: string) => {
    // If phone is empty, it means we clicked "Pick from Contacts" in MiniPay
    if (!phone) {
      if (typeof window !== "undefined") {
        const ethereum = (window as any).ethereum;
        
        // Check if we can invoke the RPC call
        if (ethereum) {
          setIsResolvingPhone(true);
          setPhoneResolutionStatus({ type: "idle", message: "" });
          try {
            // MiniPay standard contact method request
            const contact = await ethereum.request({
              method: "minipay_requestContact",
            });

            if (contact && contact.address) {
              setRecipientAddress(contact.address);
              if (contact.name) {
                setRecipientName(contact.name);
              }
              if (contact.phoneNumber) {
                const phoneVal = contact.phoneNumber;
                const matchedCountry = countries.find(c => phoneVal.startsWith(c.code));
                if (matchedCountry) {
                  setSelectedPrefix(matchedCountry.code);
                  setRecipientPhone(phoneVal.slice(matchedCountry.code.length));
                } else {
                  setRecipientPhone(phoneVal);
                }
              }
              const shortAddr = `${contact.address.slice(0, 6)}...${contact.address.slice(-4)}`;
              setPhoneResolutionStatus({
                type: "success",
                message: `Address found: ${shortAddr}`
              });
              showToast("Address found successfully!", "success");
            } else {
              setPhoneResolutionStatus({
                type: "not_found",
                message: "No contact selected or contact has no wallet."
              });
            }
          } catch (err: any) {
            console.error("Failed to retrieve contact from MiniPay:", err);
            
            // Safe parsing of error message
            const errStr = typeof err === "string" ? err : err?.message || err?.details || "";
            const errCode = err?.code;

            // Check if user cancelled
            const isUserRejected = errCode === 4001 || errStr.toLowerCase().includes("user rejected");
            if (isUserRejected) {
              setPhoneResolutionStatus({
                type: "idle",
                message: ""
              });
              setIsResolvingPhone(false);
              return;
            }

            const errMessageLower = errStr.toLowerCase();
            const isUnsupported = errMessageLower.includes("method") || 
                                  errMessageLower.includes("support") || 
                                  errMessageLower.includes("not found") || 
                                  errMessageLower.includes("not exist") ||
                                  errCode === -32601;
            const isMiniPayApp = typeof window !== "undefined" && (window as any).ethereum?.isMiniPay;

            // Always enable manual address input fallback if contact picker fails
            setShowManualAddress(true);

            if (isUnsupported) {
              if (isMiniPayApp) {
                showToast("Contact picker is not supported on this version of MiniPay.", "error");
                setPhoneResolutionStatus({
                  type: "not_found",
                  message: "Contact picker is not supported on this version of MiniPay. Please type the phone number or address manually."
                });
              } else {
                showToast("Contacts picker only works inside MiniPay app.", "error");
                setPhoneResolutionStatus({
                  type: "not_found",
                  message: "Contacts picker only works inside MiniPay app. Please type number manually."
                });
              }
            } else {
              setPhoneResolutionStatus({
                type: "not_found",
                message: "Could not retrieve contact from MiniPay. Please type phone number or enter address manually."
              });
              showToast("Failed to retrieve contact from MiniPay", "error");
            }
          } finally {
            setIsResolvingPhone(false);
          }
        } else {
          // No provider at all
          showToast("Contacts picker only works inside MiniPay app.", "error");
          setShowManualAddress(true);
          setPhoneResolutionStatus({
            type: "not_found",
            message: "Contacts picker only works inside MiniPay app. Please type number manually."
          });
        }
      }
      return;
    }

    if (!phone.startsWith("+") || phone.length < 8) {
      setPhoneResolutionStatus({ type: "idle", message: "" });
      return;
    }

    setIsResolvingPhone(true);
    setPhoneResolutionStatus({ type: "idle", message: "" });

    try {
      const sanitizedPhone = phone.replace(/[\s\-\(\)]/g, "");
      const res = await fetch("/api/agent/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: sanitizedPhone }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.walletAddress) {
        setRecipientAddress(data.walletAddress);
        const shortAddr = `${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}`;
        setPhoneResolutionStatus({
          type: "success",
          message: `Address found: ${shortAddr}`
        });
        showToast("Address found successfully!", "success");
      } else if (res.ok && data.success && !data.walletAddress) {
        setPhoneResolutionStatus({
          type: "not_found",
          message: "This person doesn't seem to have a MiniPay wallet yet."
        });
      } else {
        throw new Error(data.error || "Lookup failed");
      }
    } catch (err: any) {
      console.error("Lookup error:", err);
      setPhoneResolutionStatus({
        type: "not_found",
        message: "This person doesn't seem to have a MiniPay wallet yet."
      });
    } finally {
      setIsResolvingPhone(false);
    }
  };

  // Debounce phone lookup on typing
  useEffect(() => {
    let cleanedNumber = recipientPhone.trim().replace(/[^\d]/g, "");
    if (cleanedNumber.startsWith("0")) {
      cleanedNumber = cleanedNumber.substring(1);
    }
    if (!cleanedNumber || cleanedNumber.length < 3) {
      return;
    }
    const fullPhoneNumber = `${selectedPrefix}${cleanedNumber}`;

    // Skip redundant lookup if it's the already resolved address and loaded from storage
    if (isRestoredRef.current) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsResolvingPhone(true);
      setPhoneResolutionStatus({ type: "idle", message: "" });

      try {
        const res = await fetch("/api/agent/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.walletAddress) {
          setRecipientAddress(data.walletAddress);
          const shortAddr = `${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}`;
          setPhoneResolutionStatus({
            type: "success",
            message: `Address found: ${shortAddr}`
          });
          showToast("Address found successfully!", "success");
        } else if (res.ok && data.success && !data.walletAddress) {
          setPhoneResolutionStatus({
            type: "not_found",
            message: "This person doesn't seem to have a MiniPay wallet yet."
          });
        }
      } catch (err: any) {
        console.error("Lookup error:", err);
      } finally {
        setIsResolvingPhone(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [recipientPhone, selectedPrefix]);

  // Amount is always entered in USD
  const [amountInput, setAmountInput] = useState("");
  const [frequency, setFrequency] = useState<"One-time" | "Weekly" | "Monthly">("Monthly");
  const [startDate, setStartDate] = useState("");
  const [hasMonthlyLimit, setHasMonthlyLimit] = useState(false);
  const [maxMonthlyInput, setMaxMonthlyInput] = useState("");

  // Load previous state from localStorage if returning from review page, otherwise default start date to today
  useEffect(() => {
    const saved = localStorage.getItem("sendease_pending_remittance");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.recipientName) setRecipientName(data.recipientName);
        if (data.recipientAddress) setRecipientAddress(data.recipientAddress);
        if (data.recipientPhone) {
          // If phone has country prefix, extract it
          const phoneVal = data.recipientPhone;
          const matchedCountry = countries.find(c => phoneVal.startsWith(c.code));
          if (matchedCountry) {
            setSelectedPrefix(matchedCountry.code);
            setRecipientPhone(phoneVal.slice(matchedCountry.code.length));
          } else {
            setRecipientPhone(phoneVal);
          }
          // Set status to success since address is already resolved
          if (data.recipientAddress) {
            const shortAddr = `${data.recipientAddress.slice(0, 6)}...${data.recipientAddress.slice(-4)}`;
            setPhoneResolutionStatus({
              type: "success",
              message: `Address found: ${shortAddr}`
            });
            // Mark as restored so debounce effect knows not to trigger initial lookup
            isRestoredRef.current = true;
          }
        }
        if (data.amount) setAmountInput(data.amount.toString());
        if (data.frequency) setFrequency(data.frequency);
        if (data.startDate) setStartDate(data.startDate);
        if (data.hasMonthlyLimit !== undefined) setHasMonthlyLimit(data.hasMonthlyLimit);
        if (data.maxMonthlyAmount) setMaxMonthlyInput(data.maxMonthlyAmount.toString());

        // Clear the draft immediately after restoring, so navigating away and returning starts fresh
        localStorage.removeItem("sendease_pending_remittance");
      } catch (e) {
        console.error("Failed to parse saved pending remittance", e);
      }
    } else {
      const today = new Date().toISOString().split("T")[0];
      setStartDate(today);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (frequencyDropdownRef.current && !frequencyDropdownRef.current.contains(event.target as Node)) {
        setShowFrequencyDropdown(false);
      }
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
        setShowPhoneDropdown(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper arrays & function for Custom Calendar
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const totalDays = getDaysInMonth(calendarMonth, calendarYear);
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
    const days = [];

    // Empty spaces for previous month's alignment
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of active month
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }

    return days;
  };

  const handleDateSelect = (day: number) => {
    // Format to YYYY-MM-DD
    const formattedMonth = String(calendarMonth + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    setStartDate(`${calendarYear}-${formattedMonth}-${formattedDay}`);
    setShowCalendar(false);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear((prev) => prev - 1);
      } else {
        setCalendarMonth((prev) => prev - 1);
      }
    } else {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear((prev) => prev + 1);
      } else {
        setCalendarMonth((prev) => prev + 1);
      }
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const handlePromptSubmit = async () => {
    if (!prompt.trim()) {
      showToast("Please enter a prompt first", "error");
      return;
    }

    setAiLoading(true);
    setAiFeedback(null);
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error("Agent failed to process prompt");

      const result = await res.json();
      if (result.success && result.data) {
        if (result.data.capability === "create_schedule" && result.data.params) {
          const params = result.data.params;
          setRecipientName(params.recipientName || "");
          if (params.recipientAddress && params.recipientAddress !== "0x1234567890123456789012345678901234567890") {
            setRecipientAddress(params.recipientAddress);
          }
          setRecipientPhone(params.recipientPhone || "");

          // Set inputs. Amount is in USD
          const amountUsd = params.amount;
          setAmountInput(amountUsd.toFixed(2));

          setFrequency(params.frequency);
          if (params.startDate) {
            setStartDate(params.startDate);
          }
          setHasMonthlyLimit(params.hasMonthlyLimit || false);
          if (params.maxMonthlyAmount) {
            setMaxMonthlyInput(params.maxMonthlyAmount.toFixed(2));
          }

          showToast("Form prefilled successfully by AI!", "success");
        } else if (result.data.message) {
          setAiFeedback(result.data.message);
        }
      } else {
        setAiFeedback(result.clarification || result.error || "Unable to parse intent. Please fill manually.");
      }
    } catch (e: any) {
      console.error("AI parse error", e);
      showToast("Failed to parse prompt via AI", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleReview = () => {
    // 1. Validation
    if (!recipientName.trim()) {
      showToast("Recipient name is required", "error");
      return;
    }
    if (!recipientAddress.trim() || !isValidAddress(recipientAddress)) {
      showToast("Recipient wallet not resolved. Please enter a phone number or address manually.", "error");
      return;
    }
    const amountVal = parseFloat(amountInput) || 0;
    if (amountVal <= 0) {
      showToast("Amount must be greater than 0", "error");
      return;
    }
    if (!startDate) {
      showToast("Start date is required", "error");
      return;
    }

    let maxMonthlyVal = 0;
    if (hasMonthlyLimit) {
      maxMonthlyVal = parseFloat(maxMonthlyInput) || 0;
      if (maxMonthlyVal <= 0) {
        showToast("Monthly limit must be greater than 0", "error");
        return;
      }
      if (maxMonthlyVal < amountVal) {
        showToast("Monthly limit cannot be less than the payment amount", "error");
        return;
      }
    }

    // 2. Amounts are already in USD — store directly
    const amountUsd = amountVal;
    const maxMonthlyUsd = hasMonthlyLimit ? maxMonthlyVal : 0;

    // Combine country prefix with phone number for full reference
    const fullPhone = recipientPhone.trim() ? `${selectedPrefix}${recipientPhone.trim()}` : "";

    // 3. Save pending remittance details
    const pendingData = {
      recipientName,
      recipientAddress,
      recipientPhone: fullPhone,
      amount: amountUsd,
      displayAmount: amountVal,
      displayMaxMonthly: maxMonthlyVal,
      frequency,
      startDate,
      hasMonthlyLimit,
      maxMonthlyAmount: maxMonthlyUsd,
      currency: "USDm",
    };

    localStorage.setItem("sendease_pending_remittance", JSON.stringify(pendingData));
    router.push("/create/review");
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground leading-none">New Remittance</h1>
        </div>
        <p className="text-xs text-muted-foreground pl">Fill out the schedule details manually.</p>
      </div>

      {/* AI Parsing Block (Hidden for now)
      <Card className="border border-primary/20 bg-primary/[0.02] rounded-2xl shadow-none">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-primary text-xs font-bold tracking-wider">
            <Sparkles size={14} />
            <span>AI Intent Assistant</span>
          </div>
          <div className="space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g., "Kirim 10 USDm ke Ana tiap tanggal 5"'
              className="w-full h-16 p-3 text-xs bg-white border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-slate-400 text-foreground"
            />
            <button
              onClick={handlePromptSubmit}
              disabled={aiLoading}
              className="w-full bg-white border border-border text-[#09955F] hover:bg-primary/5 hover:border-primary/30 font-bold py-2 rounded-xl text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              {aiLoading ? "Analyzing..." : "Generate from prompt"}
            </button>
          </div>
          {aiFeedback && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex gap-2 text-xs text-orange-800">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">{aiFeedback}</p>
            </div>
          )}
        </CardContent>
      </Card>
      */}

      {/* Manual Input Form */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground tracking-wider">Schedule Details</h2>

        <div className="space-y-3">
          {/* Recipient Name */}
          <div className="space-y-1.5">
            <Label htmlFor="recipientName" className="text-xs font-bold text-foreground flex items-center gap-1">
              <User size={13} className="text-slate-400" />
              Recipient Name
            </Label>
            <Input
              id="recipientName"
              placeholder="Ana Smith"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="rounded-xl border-border focus-visible:ring-[#09955F]"
            />
          </div>

          {/* Phone Number – primary input */}
          <div className="space-y-1.5">
            <Label htmlFor="recipientPhone" className="text-xs font-bold text-foreground flex items-center gap-1">
              <Phone size={13} className="text-slate-400" />
              Recipient Phone Number
            </Label>

            {/* MiniPay: show Contacts picker button as primary CTA */}
            {typeof window !== "undefined" && (window as any).ethereum?.isMiniPay ? (
              <button
                type="button"
                id="pickContact"
                onClick={() => handlePhoneLookup("")}
                disabled={isResolvingPhone}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-[#09955F]/40 bg-[#09955F]/[0.03] text-[#09955F] hover:bg-[#09955F]/[0.07] hover:border-[#09955F]/60 font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isResolvingPhone ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Phone size={15} />
                )}
                {isResolvingPhone ? "Looking up..." : "Pick from Contacts"}
              </button>
            ) : (
              /* Fallback: structured prefix + manual phone input (size medium, matching home screen design) */
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10 shadow-xs relative">
                {/* Prefix Selector Dropdown */}
                <div className="relative shrink-0" ref={phoneDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
                    className="flex items-center gap-1 hover:bg-slate-50 active:scale-95 transition-all text-sm font-semibold text-slate-800 pr-2 border-r border-slate-200"
                  >
                    <span>{countries.find((c) => c.code === selectedPrefix)?.flag || "🏳️"}</span>
                    <span>{selectedPrefix}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>

                  {showPhoneDropdown && (
                    <div className="absolute left-0 mt-3 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in duration-150 flex flex-col max-h-60 origin-top slide-in-from-top-2">
                      {/* Search country */}
                      <div className="px-2 pb-1.5 border-b border-slate-100 flex items-center gap-1">
                        <Search className="w-3 h-3 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="w-full text-xs border-none outline-none p-0 focus:ring-0 placeholder-slate-300 text-slate-700 bg-transparent"
                        />
                      </div>

                      <div className="overflow-y-auto flex-1 mt-1">
                        {countries
                          .filter(
                            (c) =>
                              c.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
                              c.code.includes(countrySearch)
                          )
                          .map((c) => (
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
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="tel"
                  placeholder="8123456789"
                  value={recipientPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d]/g, "");
                    setRecipientPhone(val);
                    // Reset restored ref since user is modifying phone manually
                    isRestoredRef.current = false;
                    if (phoneResolutionStatus.type !== "idle") {
                      setPhoneResolutionStatus({ type: "idle", message: "" });
                      setRecipientAddress("");
                    }
                  }}
                  className="bg-transparent border-none outline-none text-sm font-normal p-0 text-slate-900 placeholder:text-muted-foreground w-full focus:ring-0 ml-1"
                />

                {isResolvingPhone ? (
                  <Loader2 size={13} className="animate-spin text-[#09955F] shrink-0" />
                ) : (
                  recipientPhone.length >= 5 && (
                    <button
                      type="button"
                      onClick={() => handlePhoneLookup(`${selectedPrefix}${recipientPhone}`)}
                      className="p-1 hover:bg-slate-100 rounded-lg text-[#09955F] transition-all shrink-0"
                      title="Lookup phone number"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            )}

            {/* Status feedback */}
            {phoneResolutionStatus.type === "success" && (
              <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-[11px] text-emerald-700 font-bold">Wallet found!</p>
                    <p className="text-[11px] text-emerald-600 font-mono">{recipientAddress.slice(0, 10)}...{recipientAddress.slice(-6)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(recipientAddress);
                    setCopied(true);
                    showToast("Wallet address copied!", "success");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-600 hover:text-emerald-700 transition-all shrink-0"
                  title="Copy address"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Not found → invite link */}
            {phoneResolutionStatus.type === "not_found" && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200 space-y-2">
                <div className="flex items-start gap-2">
                  <UserX size={14} className="shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                    {phoneResolutionStatus.message || "This person doesn't have a MiniPay wallet yet."}
                  </p>
                </div>
                <button
                  type="button"
                  id="sendInviteLink"
                  onClick={handleCopyInvite}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs transition-colors active:scale-[0.98]"
                >
                  <Share2 size={12} />
                  Copy Invite Link
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualAddress(true)}
                  className="w-full text-center text-[11px] text-muted-foreground underline underline-offset-2"
                >
                  Enter wallet address manually instead
                </button>
              </div>
            )}
          </div>

          {/* Wallet Address – hidden by default, shown only as fallback */}
          {(showManualAddress && phoneResolutionStatus.type !== "success") && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
              <Label htmlFor="recipientAddress" className="text-xs font-bold text-foreground flex items-center gap-1">
                <Wallet size={13} className="text-slate-400" />
                Wallet Address (Celo) — Fallback
              </Label>
              <Input
                id="recipientAddress"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="rounded-xl border-border font-mono text-xs focus-visible:ring-[#09955F]"
              />
              <p className="text-[10px] text-muted-foreground">Enter a valid Celo wallet address if the recipient is not on MiniPay.</p>
            </div>
          )}

          {/* Amount and Frequency Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-bold text-foreground">
                Amount (USD)
              </Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 50"
                value={amountInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || parseFloat(val) >= 0) {
                    setAmountInput(val);
                  }
                }}
                className="rounded-xl border-border focus-visible:ring-[#09955F]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frequency" className="text-xs font-bold text-foreground">
                Frequency
              </Label>
              <div className="relative w-full" ref={frequencyDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-[#09955F]"
                >
                  <span className="font-medium text-slate-800">{frequency}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {showFrequencyDropdown && (
                  <div className="absolute right-0 left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                    {(["One-time", "Weekly", "Monthly"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setFrequency(option);
                          setShowFrequencyDropdown(false);
                        }}
                        className={`flex items-center w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors ${frequency === option ? "bg-slate-100/70 font-semibold text-slate-900" : "text-slate-600"
                          }`}
                      >
                        <span className="text-sm">{option}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <Label htmlFor="startDate" className="text-xs font-bold text-foreground flex items-center gap-1">
              <Calendar size={13} className="text-slate-400" />
              Start Date
            </Label>
            <div className="relative w-full" ref={calendarRef}>
              <button
                type="button"
                onClick={() => {
                  if (startDate) {
                    const [year, month] = startDate.split("-");
                    setCalendarMonth(parseInt(month) - 1);
                    setCalendarYear(parseInt(year));
                  }
                  setShowCalendar(!showCalendar);
                }}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-[#09955F]"
              >
                <span className="font-medium text-slate-800">{formatDateDisplay(startDate)}</span>
                <Calendar size={15} className="text-slate-400 shrink-0" />
              </button>

              {showCalendar && (
                <div className="absolute left-0 bottom-full mb-2 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150 w-72">
                  {/* Calendar Header */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-slate-800">
                      {monthNames[calendarMonth]} {calendarYear}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => navigateMonth("prev")}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors text-sm font-bold"
                      >
                        &larr;
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateMonth("next")}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors text-sm font-bold"
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid Header */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {dayNames.map((day, idx) => (
                      <span key={idx} className="text-[10px] font-bold text-slate-400">
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays().map((day, idx) => {
                      if (day === null) {
                        return <div key={idx} />;
                      }

                      const formattedMonth = String(calendarMonth + 1).padStart(2, "0");
                      const formattedDay = String(day).padStart(2, "0");
                      const itemDateStr = `${calendarYear}-${formattedMonth}-${formattedDay}`;
                      const isSelected = startDate === itemDateStr;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleDateSelect(day)}
                          className={`h-7 w-7 text-xs rounded-full flex items-center justify-center transition-all ${isSelected
                            ? "bg-[#09955F] text-white font-bold"
                            : "hover:bg-slate-100 text-slate-700"
                            }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Clear & Today controls */}
                  <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split("T")[0];
                        setStartDate(today);
                        setShowCalendar(false);
                      }}
                      className="text-xs text-[#09955F] font-bold hover:underline"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCalendar(false)}
                      className="text-xs text-slate-400 font-bold hover:underline"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Safety Limit Toggle */}
          <div className="flex items-center justify-between gap-4 p-3 border border-border rounded-xl bg-primary/[0.02]">
            <div className="flex-1 pr-2">
              <p className="text-xs font-bold text-foreground">Enable Monthly Limit</p>
              <p className="text-xs text-muted-foreground">Automatically pause if total monthly transfers exceed this value</p>
            </div>
            <input
              type="checkbox"
              checked={hasMonthlyLimit}
              onChange={(e) => setHasMonthlyLimit(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-[#09955F] cursor-pointer shrink-0"
            />
          </div>

          {/* Limit Input */}
          {hasMonthlyLimit && (
            <div className="space-y-1.5 animate-in fade-in duration-300">
              <Label htmlFor="maxMonthlyAmount" className="text-xs font-bold text-foreground">
                Max Monthly Amount (USD)
              </Label>
              <Input
                id="maxMonthlyAmount"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 200"
                value={maxMonthlyInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || parseFloat(val) >= 0) {
                    setMaxMonthlyInput(val);
                  }
                }}
                className="rounded-xl border-border focus-visible:ring-[#09955F]"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleReview}
          className="w-full bg-[#09955F] text-white hover:bg-[#07824F] font-bold py-2.5 rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
        >
          <span>Review & Approve</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
