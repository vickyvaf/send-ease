"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/navigation";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, type Hex } from "viem";
import { ShieldCheck, User, Calendar, DollarSign, Activity, Settings, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/context/toast-context";
import { REMITTANCE_ABI, REMITTANCE_ADDRESSES } from "@/lib/contracts";
import { getStablecoinTokens } from "@/lib/stablecoin-tokens";
import { truncateAddress, formatAmount } from "@/lib/app-utils";

const ERC20_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export default function ReviewApprove() {
  const router = useRouter();
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { showToast } = useToast();

  const [pending, setPending] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"approve" | "create" | "done">("approve");

  const chainId = chain?.id || 42220;
  const contractAddress = REMITTANCE_ADDRESSES[chainId as keyof typeof REMITTANCE_ADDRESSES] || REMITTANCE_ADDRESSES[42220];
  
  const tokens = getStablecoinTokens(chainId);
  const usdmToken = tokens.find((t) => t.symbol === "USDm") || tokens[1];

  useEffect(() => {
    const saved = localStorage.getItem("sendease_pending_remittance");
    if (saved) {
      try {
        setPending(JSON.parse(saved));
      } catch (e) {
        console.error(e);
        router.push("/create");
      }
    } else {
      router.push("/create");
    }
  }, [router]);

  const checkAllowanceAndSign = async () => {
    if (!isConnected || !address || !walletClient || !publicClient || !usdmToken || !pending) {
      showToast("Please connect your wallet first", "error");
      return;
    }

    setLoading(true);
    try {
      const amountWei = parseUnits(pending.amount.toString(), usdmToken.decimals);
      
      // 1. Check Allowance
      showToast("Checking token allowance...", "success");
      const currentAllowance = await publicClient.readContract({
        address: usdmToken.address,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, contractAddress],
      });

      if (currentAllowance < amountWei) {
        setStep("approve");
        showToast("Approving USDm stablecoin for scheduler...", "success");
        
        // Approve Max to avoid repeated allowance prompts
        const maxVal = parseUnits("100000000", usdmToken.decimals);
        const approveHash = await walletClient.writeContract({
          address: usdmToken.address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [contractAddress, maxVal],
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        showToast("Allowance approved successfully!", "success");
      }

      // 2. Create Schedule
      setStep("create");
      showToast("Signing schedule creation...", "success");

      const frequencyId = pending.frequency === "One-time" ? 0 : pending.frequency === "Weekly" ? 1 : 2;
      const startTimestamp = Math.floor(new Date(pending.startDate).getTime() / 1000);
      const limitAmountWei = pending.hasMonthlyLimit 
        ? parseUnits(pending.maxMonthlyAmount.toString(), usdmToken.decimals)
        : 0n;

      const createHash = await walletClient.writeContract({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: "createSchedule",
        args: [
          pending.recipientAddress,
          pending.recipientName,
          pending.recipientPhone,
          amountWei,
          BigInt(frequencyId),
          BigInt(startTimestamp),
          pending.hasMonthlyLimit,
          limitAmountWei,
        ],
      });

      showToast("Creating schedule on-chain...", "success");
      await publicClient.waitForTransactionReceipt({ hash: createHash });
      
      showToast("Remittance scheduled successfully!", "success");
      setStep("done");
      localStorage.removeItem("sendease_pending_remittance");
      router.push("/");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Signing transaction failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!pending) {
    return <div className="text-center py-10 text-sm text-muted-foreground">Loading pending remittance...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground text-sm shrink-0 flex items-center gap-1 font-bold">
          ← Back
        </button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Confirm Remittance</h1>
        <p className="text-xs text-muted-foreground">Review details and approve transactions in MiniPay.</p>
      </div>

      {/* Summary Card */}
      <Card className="border border-border rounded-2xl shadow-none">
        <CardContent className="p-5 space-y-4">
          {/* Recipient */}
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10">
              <User size={16} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold tracking-wider">Recipient</p>
              <p className="font-bold text-sm text-foreground">{pending.recipientName}</p>
              <p className="text-xs font-mono text-slate-400">{truncateAddress(pending.recipientAddress)}</p>
              {pending.recipientPhone && <p className="text-xs text-slate-400">{pending.recipientPhone}</p>}
            </div>
          </div>

          {/* Amount */}
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10">
              <DollarSign size={16} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold tracking-wider">Payment Amount</p>
              <p className="font-bold text-sm text-foreground">
                ${formatAmount(pending.displayAmount)} USD
              </p>
              <p className="text-xs text-slate-400">≈ {pending.amount.toFixed(2)} USDm</p>
            </div>
          </div>

          {/* Schedule */}
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold tracking-wider">Schedule & Start</p>
              <p className="font-bold text-sm text-foreground">{pending.frequency}</p>
              <p className="text-xs text-slate-400">Starts: {pending.startDate}</p>
            </div>
          </div>

          {/* Limits */}
          {pending.hasMonthlyLimit && (
            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10">
                <Settings size={16} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold tracking-wider">Safety Limits</p>
                <p className="font-bold text-sm text-foreground">
                  Max ${formatAmount(pending.displayMaxMonthly)} / month
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safety Notice */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 text-xs text-emerald-800">
        <ShieldCheck size={18} className="shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Fully Secure</p>
          <p className="leading-relaxed">You are giving the contract allowance to execute payments according to the schedules you design. You can cancel or pause this schedule at any time on-chain.</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={checkAllowanceAndSign}
          disabled={loading}
          className="w-full bg-[#09955F] text-white hover:bg-[#07824F] font-bold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>{step === "approve" ? "Approving Stablecoin..." : "Creating Schedule..."}</span>
          ) : (
            <span>Confirm & Sign in MiniPay</span>
          )}
        </button>
        <button
          onClick={() => router.back()}
          disabled={loading}
          className="w-full bg-white border border-border text-foreground hover:bg-primary/5 hover:border-primary/30 font-bold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Modify Details
        </button>
      </div>
    </div>
  );
}
