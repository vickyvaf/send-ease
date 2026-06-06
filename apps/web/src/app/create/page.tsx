"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Calendar, User, Phone, Wallet, AlertCircle, ArrowRight, Loader2, Search, CheckCircle2, ChevronLeft, Share2, UserX, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/context/toast-context";
import { isValidAddress } from "@/lib/app-utils";

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
    // If running in MiniPay, use the native contact picker
    if (typeof window !== "undefined" && (window as any).ethereum?.isMiniPay) {
      setIsResolvingPhone(true);
      setPhoneResolutionStatus({ type: "idle", message: "" });
      try {
        const contact = await (window as any).ethereum.request({
          method: "minipay_requestContact",
        });
        if (contact && contact.address) {
          setRecipientAddress(contact.address);
          if (contact.name) {
            setRecipientName(contact.name);
          }
          if (contact.phoneNumber) {
            setRecipientPhone(contact.phoneNumber);
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
        console.error("minipay_requestContact failed:", err);
        showToast("Failed to retrieve contact from MiniPay", "error");
      } finally {
        setIsResolvingPhone(false);
      }
      return;
    }

    if (!phone || !phone.startsWith("+") || phone.length < 8) {
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
    const sanitized = recipientPhone.replace(/[\s\-\(\)]/g, "");
    if (!sanitized || !sanitized.startsWith("+") || sanitized.length < 5) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsResolvingPhone(true);
      setPhoneResolutionStatus({ type: "idle", message: "" });

      try {
        const res = await fetch("/api/agent/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: sanitized }),
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
  }, [recipientPhone]);

  // Amount is always entered in USD
  const [amountInput, setAmountInput] = useState("");
  const [frequency, setFrequency] = useState<"One-time" | "Weekly" | "Monthly">("Monthly");
  const [startDate, setStartDate] = useState("");
  const [hasMonthlyLimit, setHasMonthlyLimit] = useState(false);
  const [maxMonthlyInput, setMaxMonthlyInput] = useState("");

  // Default start date to today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (frequencyDropdownRef.current && !frequencyDropdownRef.current.contains(event.target as Node)) {
        setShowFrequencyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

    // 3. Save pending remittance details
    const pendingData = {
      recipientName,
      recipientAddress,
      recipientPhone,
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
              placeholder="e.g. Ana Smith"
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#09955F]/40 bg-[#09955F]/[0.03] text-[#09955F] hover:bg-[#09955F]/[0.07] hover:border-[#09955F]/60 font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isResolvingPhone ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Phone size={15} />
                )}
                {isResolvingPhone ? "Looking up..." : "Pick from Contacts"}
              </button>
            ) : (
              /* Fallback: manual phone input + lookup button */
              <div className="flex gap-2">
                <Input
                  id="recipientPhone"
                  placeholder="e.g. +628123456789"
                  value={recipientPhone}
                  onChange={(e) => {
                    setRecipientPhone(e.target.value);
                    if (phoneResolutionStatus.type !== "idle") {
                      setPhoneResolutionStatus({ type: "idle", message: "" });
                      setRecipientAddress("");
                    }
                  }}
                  onBlur={() => {
                    if (recipientPhone.startsWith("+") && recipientPhone.length >= 8) {
                      handlePhoneLookup(recipientPhone);
                    }
                  }}
                  className="rounded-xl border-border focus-visible:ring-[#09955F] flex-1"
                />
                {recipientPhone.startsWith("+") && recipientPhone.length >= 8 && (
                  <button
                    type="button"
                    onClick={() => handlePhoneLookup(recipientPhone)}
                    disabled={isResolvingPhone}
                    className="px-3 bg-white hover:bg-primary/5 text-[#09955F] disabled:opacity-50 text-xs font-bold rounded-xl border border-border hover:border-primary/30 transition-colors flex items-center gap-1 active:scale-[0.98]"
                  >
                    {isResolvingPhone ? <Loader2 size={13} className="animate-spin text-[#09955F]" /> : <Search size={13} />}
                    Lookup
                  </button>
                )}
              </div>
            )}

            {/* Status feedback */}
            {phoneResolutionStatus.type === "success" && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <p className="text-[11px] text-emerald-700 font-bold">Wallet found!</p>
                  <p className="text-[11px] text-emerald-600 font-mono">{recipientAddress.slice(0, 10)}...{recipientAddress.slice(-6)}</p>
                </div>
              </div>
            )}

            {/* Not found → invite link */}
            {phoneResolutionStatus.type === "not_found" && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200 space-y-2">
                <div className="flex items-start gap-2">
                  <UserX size={14} className="shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                    This person doesn&apos;t have a MiniPay wallet yet.
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
                        className={`flex items-center w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                          frequency === option ? "bg-slate-100/70 font-semibold text-slate-900" : "text-slate-600"
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
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border-border focus-visible:ring-[#09955F]"
            />
          </div>

          {/* Safety Limit Toggle */}
          <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-primary/[0.02]">
            <div>
              <p className="text-xs font-bold text-foreground">Enable Monthly Limit</p>
              <p className="text-xs text-muted-foreground">Pause automatically if spending exceeds this limit</p>
            </div>
            <input
              type="checkbox"
              checked={hasMonthlyLimit}
              onChange={(e) => setHasMonthlyLimit(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-[#09955F] cursor-pointer"
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
          className="w-full bg-[#09955F] text-white hover:bg-[#07824F] font-bold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
        >
          <span>Review & Approve</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
