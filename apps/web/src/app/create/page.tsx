"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Calendar, User, Phone, Wallet, AlertCircle, ArrowRight, Loader2, Search, CheckCircle2, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/context/toast-context";
import { useCurrency } from "@/context/currency-context";
import { isValidAddress } from "@/lib/app-utils";

export default function CreateRemittance() {
  const router = useRouter();
  const { showToast } = useToast();
  const { currency, convertStableUsdToDisplay, convertDisplayToStableUsd } = useCurrency();

  // Prompt/AI State
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Form Fields
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // ODIS Phone Lookup State
  const [isResolvingPhone, setIsResolvingPhone] = useState(false);
  const [phoneResolutionStatus, setPhoneResolutionStatus] = useState<{
    type: "success" | "error" | "idle";
    message: string;
  }>({ type: "idle", message: "" });

  const handlePhoneLookup = async (phone: string) => {
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
          type: "error",
          message: "Failed to find any registered wallet for this phone number."
        });
        showToast("Failed to find wallet address", "error");
      } else {
        throw new Error(data.error || "Lookup failed");
      }
    } catch (err: any) {
      console.error("Lookup error:", err);
      setPhoneResolutionStatus({
        type: "error",
        message: "Failed to find wallet address. ODIS lookup error."
      });
    } finally {
      setIsResolvingPhone(false);
    }
  };

  // Amount is always entered in the active DISPLAY currency (USD or IDR)
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

          // Set inputs. Amount is converted from USD to display currency
          const amountUsd = params.amount;
          const displayAmount = convertStableUsdToDisplay(amountUsd, "USDm");
          setAmountInput(displayAmount.toFixed(2));

          setFrequency(params.frequency);
          if (params.startDate) {
            setStartDate(params.startDate);
          }
          setHasMonthlyLimit(params.hasMonthlyLimit || false);
          if (params.maxMonthlyAmount) {
            const displayMax = convertStableUsdToDisplay(params.maxMonthlyAmount, "USDm");
            setMaxMonthlyInput(displayMax.toFixed(2));
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
      showToast("Invalid Celo wallet address", "error");
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

    // 2. Convert amounts back to USDm standard (18 decimals) for contract execution
    // Since input is in display currency (USD or IDR)
    const amountUsd = convertDisplayToStableUsd(amountVal, "USDm");
    const maxMonthlyUsd = hasMonthlyLimit ? convertDisplayToStableUsd(maxMonthlyVal, "USDm") : 0;

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
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="h-9 w-9 border border-border bg-white text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/30 rounded-full transition-all shrink-0 flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground leading-none">New Remittance</h1>
        </div>
        <p className="text-xs text-muted-foreground pl-12">Describe in text or fill out the schedule manually.</p>
      </div>

      {/* AI Parsing Block */}
      <Card className="border border-primary/20 bg-primary/[0.02] rounded-2xl shadow-none">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
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

      {/* Manual Input Form */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Schedule Details</h2>

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

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label htmlFor="recipientPhone" className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Phone size={13} className="text-slate-400" />
              Recipient Phone Number (Optional)
            </Label>
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
                  className="px-3 bg-white hover:bg-primary/5 text-primary disabled:opacity-50 text-xs font-bold rounded-xl border border-border hover:border-primary/30 transition-colors flex items-center gap-1 active:scale-[0.98]"
                >
                  {isResolvingPhone ? (
                    <Loader2 size={13} className="animate-spin text-primary" />
                  ) : (
                    <Search size={13} />
                  )}
                  Lookup
                </button>
              )}
            </div>
            {phoneResolutionStatus.type === "success" && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                <CheckCircle2 size={12} className="shrink-0" />
                {phoneResolutionStatus.message}
              </p>
            )}
            {phoneResolutionStatus.type === "error" && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle size={12} className="shrink-0" />
                {phoneResolutionStatus.message}
              </p>
            )}
          </div>

          {/* Wallet Address */}
          <div className="space-y-1.5">
            <Label htmlFor="recipientAddress" className="text-xs font-bold text-foreground flex items-center gap-1">
              <Wallet size={13} className="text-slate-400" />
              Recipient Wallet Address (Celo)
            </Label>
            <Input
              id="recipientAddress"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              disabled={phoneResolutionStatus.type === "success"}
              className="rounded-xl border-border font-mono text-xs focus-visible:ring-[#09955F] disabled:opacity-75 disabled:bg-primary/[0.02] disabled:cursor-not-allowed"
            />
          </div>

          {/* Amount and Frequency Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-bold text-foreground">
                Amount ({currency})
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g. 50"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="rounded-xl border-border focus-visible:ring-[#09955F]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frequency" className="text-xs font-bold text-foreground">
                Frequency
              </Label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e: any) => setFrequency(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus:border-[#09955F]"
              >
                <option value="One-time">One-time</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
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
                Max Monthly Amount ({currency})
              </Label>
              <Input
                id="maxMonthlyAmount"
                type="number"
                placeholder="e.g. 200"
                value={maxMonthlyInput}
                onChange={(e) => setMaxMonthlyInput(e.target.value)}
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
