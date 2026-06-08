"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { Calendar, Clock, ShieldAlert, CheckCircle, XCircle, Trash2, Edit2, Play, Pause, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/context/toast-context";
import { REMITTANCE_ABI, REMITTANCE_ADDRESSES } from "@/lib/contracts";
import { getStablecoinTokens } from "@/lib/stablecoin-tokens";
import { truncateAddress, formatAmount } from "@/lib/app-utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ScheduleDetail({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const scheduleId = BigInt(id);

  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { showToast } = useToast();

  const [schedule, setSchedule] = useState<any>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingAction, setSigningAction] = useState(false);

  // Edit Settings Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editHasLimit, setEditHasLimit] = useState(false);
  const [editLimit, setEditLimit] = useState("");

  const chainId = chain?.id || 42220;
  const contractAddress = REMITTANCE_ADDRESSES[chainId as keyof typeof REMITTANCE_ADDRESSES] || REMITTANCE_ADDRESSES[42220];
  
  const tokens = getStablecoinTokens(chainId);
  const usdmToken = tokens.find((t) => t.symbol === "USDm") || tokens[1];

  const fetchDetails = useCallback(async () => {
    if (!isConnected || !address || !publicClient) return;

    const cacheKey = `sendease_schedule_cache_${scheduleId.toString()}`;
    let hasCache = false;
    const cachedSchedule = localStorage.getItem(cacheKey);
    if (cachedSchedule) {
      try {
        const parsedCache = JSON.parse(cachedSchedule);
        if (parsedCache.schedule) {
          setSchedule(parsedCache.schedule);
          setHistoryLogs(parsedCache.historyLogs || []);
          
          // Pre-fill form inputs from cache
          setEditAmount(Number(parsedCache.schedule.amount).toFixed(2));
          setEditHasLimit(parsedCache.schedule.hasMonthlyLimit);
          if (parsedCache.schedule.hasMonthlyLimit) {
            setEditLimit(Number(parsedCache.schedule.maxMonthlyAmount).toFixed(2));
          }
          hasCache = true;
        }
      } catch (e) {
        console.error("Failed to parse schedule cache", e);
      }
    }

    if (!hasCache) {
      setLoading(true);
    }
    
    let mappedSchedule: any = null;
    try {
      // 1. Fetch Schedule Config
      const s = (await publicClient.readContract({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: "getSchedule",
        args: [scheduleId],
      })) as any;

      if (Number(s.id) === 0 && Number(scheduleId) !== 0) {
        throw new Error("Schedule not found on-chain");
      }

      mappedSchedule = {
        id: Number(s.id),
        owner: s.owner,
        recipient: s.recipient,
        amount: parseFloat(formatUnits(s.amount, 18)),
        frequency: Number(s.frequency),
        startDate: Number(s.startDate),
        nextExecutionTimestamp: Number(s.nextExecutionTimestamp),
        hasMonthlyLimit: s.hasMonthlyLimit,
        maxMonthlyAmount: parseFloat(formatUnits(s.maxMonthlyAmount, 18)),
        currentMonthPaid: parseFloat(formatUnits(s.currentMonthPaid, 18)),
        status: Number(s.status),
        recipientName: s.recipientName,
        recipientPhone: s.recipientPhone,
      };
      setSchedule(mappedSchedule);

      // Pre-fill form inputs — amounts are in USD
      setEditAmount(mappedSchedule.amount.toFixed(2));
      setEditHasLimit(mappedSchedule.hasMonthlyLimit);
      if (mappedSchedule.hasMonthlyLimit) {
        setEditLimit(mappedSchedule.maxMonthlyAmount.toFixed(2));
      }
    } catch (e: any) {
      const isContractNotDeployed = e instanceof Error && (
        e.message.includes("returned no data") ||
        e.message.includes("0x") ||
        e.message.includes("not a contract")
      );
      
      // Try to load from localStorage fallback
      const savedLocalSchedules = localStorage.getItem("sendease_local_schedules");
      if (savedLocalSchedules) {
        try {
          const localSchedules = JSON.parse(savedLocalSchedules);
          const found = localSchedules.find((item: any) => Number(item.id) === Number(scheduleId));
          if (found) {
            setSchedule(found);
            
            // Pre-fill form inputs for local schedule fallback
            setEditAmount(Number(found.amount).toFixed(2));
            setEditHasLimit(found.hasMonthlyLimit);
            if (found.hasMonthlyLimit) {
              setEditLimit(Number(found.maxMonthlyAmount).toFixed(2));
            }
            
            setHistoryLogs([]); // No on-chain history logs for mock local schedules
            
            // Update cache
            localStorage.setItem(cacheKey, JSON.stringify({
              schedule: found,
              historyLogs: []
            }));

            setLoading(false);
            return;
          }
        } catch (localErr) {
          console.error("Failed to read local schedule fallback:", localErr);
        }
      }

      if (isContractNotDeployed) {
        console.warn(`RemittanceContract is not deployed at ${contractAddress} on chain ${chainId}.`);
        setSchedule(null);
      } else {
        console.error("Failed to load schedule:", e);
        showToast("Failed to load schedule details", "error");
        setSchedule(null);
      }
      setLoading(false);
      return;
    }

    try {
      // 2. Fetch specific logs for this schedule
      const events = await publicClient.getContractEvents({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        eventName: "PaymentExecuted",
        fromBlock: "earliest",
      });

      const parsedLogs = [];
      for (const ev of events) {
        const args = ev.args as any;
        if (Number(args.scheduleId) === Number(scheduleId)) {
          let timeStr = "Recently";
          try {
            const block = await publicClient.getBlock({ blockNumber: ev.blockNumber });
            const d = new Date(Number(block.timestamp) * 1000);
            const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
            timeStr = `${datePart} ${timePart}`;
          } catch {}

          parsedLogs.push({
            amount: parseFloat(formatUnits(args.amount, 18)),
            timestamp: timeStr,
            txHash: ev.transactionHash,
          });
        }
      }
      const finalLogs = parsedLogs.reverse();
      setHistoryLogs(finalLogs);

      // Update cache with fresh data
      localStorage.setItem(cacheKey, JSON.stringify({
        schedule: mappedSchedule,
        historyLogs: finalLogs
      }));
    } catch (e: any) {
      console.error("Failed to fetch event logs:", e);
      setHistoryLogs([]);
      
      // Update cache even if logs fail
      localStorage.setItem(cacheKey, JSON.stringify({
        schedule: mappedSchedule,
        historyLogs: []
      }));
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, publicClient, scheduleId, contractAddress, showToast]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Actions
  const handleTogglePause = async () => {
    if (!walletClient || !publicClient || !schedule) return;

    setSigningAction(true);
    try {
      const isPaused = schedule.status === 1;
      const functionName = isPaused ? "resumeSchedule" : "pauseSchedule";
      
      showToast(`${isPaused ? "Resuming" : "Pausing"} remittance schedule...`, "success");
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName,
        args: [scheduleId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      showToast(`Schedule ${isPaused ? "resumed" : "paused"} successfully!`, "success");
      await fetchDetails();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to update schedule status", "error");
    } finally {
      setSigningAction(false);
    }
  };

  const handleCancel = async () => {
    if (!walletClient || !publicClient || !schedule) return;

    if (!confirm("Are you sure you want to cancel this remittance schedule? This action cannot be undone.")) return;

    setSigningAction(true);
    try {
      showToast("Cancelling remittance schedule...", "success");
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: "cancelSchedule",
        args: [scheduleId],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      showToast("Schedule cancelled successfully!", "success");
      await fetchDetails();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to cancel schedule", "error");
    } finally {
      setSigningAction(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!walletClient || !publicClient || !schedule || !usdmToken) return;

    const amountVal = parseFloat(editAmount) || 0;
    if (amountVal <= 0) {
      showToast("Amount must be greater than 0", "error");
      return;
    }

    let limitVal = 0;
    if (editHasLimit) {
      limitVal = parseFloat(editLimit) || 0;
      if (limitVal <= 0) {
        showToast("Monthly limit must be greater than 0", "error");
        return;
      }
      if (limitVal < amountVal) {
        showToast("Limit cannot be less than payment amount", "error");
        return;
      }
    }

    setSigningAction(true);
    try {
      // Amounts are already in USD
      const amountUsd = amountVal;
      const limitUsd = editHasLimit ? limitVal : 0;

      const amountWei = parseUnits(amountUsd.toString(), usdmToken.decimals);
      const limitWei = parseUnits(limitUsd.toString(), usdmToken.decimals);

      showToast("Saving schedule changes...", "success");
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: "editSchedule",
        args: [scheduleId, amountWei, editHasLimit, limitWei],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      showToast("Schedule updated successfully!", "success");
      setIsEditing(false);
      await fetchDetails();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to update schedule settings", "error");
    } finally {
      setSigningAction(false);
    }
  };

  const getFrequencyLabel = (freq: number) => {
    if (freq === 0) return "One-time";
    if (freq === 1) return "Weekly";
    return "Monthly";
  };

  const getStatusBadgeClass = (status: number) => {
    if (status === 0) return "bg-[#DCFCE7] text-[#166534]"; // Active
    if (status === 1) return "bg-[#FEF9C3] text-[#92400E]"; // Paused
    if (status === 2) return "bg-[#FEE2E2] text-[#B91C1C]"; // Cancelled
    return "bg-[#E0F2FE] text-[#0369A1]"; // Completed
  };

  const getStatusLabel = (status: number) => {
    if (status === 0) return "Active";
    if (status === 1) return "Paused";
    if (status === 2) return "Cancelled";
    return "Completed";
  };

  if (loading) {
    return <div className="text-center py-20 text-sm text-muted-foreground animate-pulse">Loading schedule details...</div>;
  }

  if (!schedule) {
    return <div className="text-center py-20 text-sm text-muted-foreground">Schedule not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm shrink-0 flex items-center gap-1 font-bold">
          ← Back
        </Link>
      </div>

      {/* Recipient Header Card */}
      <Card className="border border-border rounded-2xl shadow-none">
        <CardContent className="p-6 text-center space-y-3">
          <div className="h-16 w-16 rounded-full bg-emerald-50 text-[#09955F] flex items-center justify-center text-xl font-black mx-auto border border-[#09955F]/20">
            {schedule.recipientName.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">{schedule.recipientName}</h1>
            <p className="text-xs text-muted-foreground font-mono">{schedule.recipient}</p>
            {schedule.recipientPhone && <p className="text-xs text-muted-foreground">{schedule.recipientPhone}</p>}
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wider ${getStatusBadgeClass(schedule.status)}`}>
              {getStatusLabel(schedule.status)}
            </span>
            <span className="text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
              {getFrequencyLabel(schedule.frequency)}
            </span>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground font-bold tracking-wider">Payment Amount</p>
            <p className="text-2xl font-black text-foreground">
              ${formatAmount(schedule.amount)} USD
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings / Edit Mode */}
      <Card className="border border-border rounded-2xl shadow-none">
        <CardContent className="p-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <h2 className="text-xs font-bold text-foreground tracking-wider">Remittance Settings</h2>
            {(schedule.status === 0 || schedule.status === 1) && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[#09955F] hover:underline font-bold text-xs flex items-center gap-1"
              >
                <Edit2 size={12} />
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="editAmount" className="text-xs font-bold text-foreground">
                  Payment Amount (USD)
                </Label>
                <Input
                  id="editAmount"
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="rounded-xl border-border"
                />
              </div>

              <div className="flex items-center justify-between gap-4 p-3 border border-border rounded-xl bg-primary/[0.02]">
                <div className="flex-1 pr-2">
                  <p className="text-xs font-bold text-foreground">Enable Monthly Limit</p>
                  <p className="text-xs text-muted-foreground">Automatically pause if total monthly transfers exceed this value</p>
                </div>
                <input
                  type="checkbox"
                  checked={editHasLimit}
                  onChange={(e) => setEditHasLimit(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-[#09955F] cursor-pointer shrink-0"
                />
              </div>

              {editHasLimit && (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <Label htmlFor="editLimit" className="text-xs font-bold text-foreground">
                    Max Monthly Amount (USD)
                  </Label>
                  <Input
                    id="editLimit"
                    type="number"
                    value={editLimit}
                    onChange={(e) => setEditLimit(e.target.value)}
                    className="rounded-xl border-border"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveChanges}
                  disabled={signingAction}
                  className="flex-1 bg-[#09955F] text-white hover:bg-[#07824F] font-bold py-2 rounded-xl text-xs active:scale-[0.98] transition-transform"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={signingAction}
                  className="flex-1 bg-white border border-border text-foreground hover:bg-primary/5 hover:border-primary/30 font-bold py-2 rounded-xl text-xs active:scale-[0.98] transition-transform"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {schedule.nextExecutionTimestamp > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Scheduled Date</span>
                  <span className="font-bold text-foreground">
                    {(() => {
                      const d = new Date(schedule.nextExecutionTimestamp * 1000);
                      const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      const timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
                      return `${datePart} ${timePart}`;
                    })()}
                  </span>
                </div>
              )}
              {schedule.hasMonthlyLimit ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Limit Used</span>
                    <span className="font-bold text-foreground">
                      ${formatAmount(schedule.currentMonthPaid)} / ${formatAmount(schedule.maxMonthlyAmount)}
                    </span>
                  </div>
                  {/* Flat progress bar */}
                  <div className="w-full bg-primary/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#09955F] h-full transition-all"
                      style={{ width: `${Math.min(100, (schedule.currentMonthPaid / schedule.maxMonthlyAmount) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Limit</span>
                  <span className="font-bold text-slate-400">Disabled</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground tracking-wider px-1">Payment History Log</h2>
        {historyLogs.length > 0 ? (
          <div className="space-y-2">
            {historyLogs.map((log, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 border border-border rounded-xl bg-white text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground">Payment Transferred</p>
                  <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="font-bold text-foreground">
                    +${formatAmount(log.amount)}
                  </p>
                  <a
                    href={`https://celoscan.io/tx/${log.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#09955F] hover:underline flex items-center justify-end gap-0.5"
                  >
                    View Tx <ExternalLink size={8} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-primary/[0.02] rounded-2xl border border-dashed border-primary/20">
            <p className="text-xs text-muted-foreground">No transaction logs available for this schedule</p>
          </div>
        )}
      </div>

      {/* Action Controls (Pause / Cancel) */}
      {!isEditing && (schedule.status === 0 || schedule.status === 1) && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleTogglePause}
            disabled={signingAction}
            className="flex-1 bg-white border border-border text-foreground hover:bg-primary/5 hover:border-primary/30 font-bold py-2.5 rounded-xl text-xs active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
          >
            {schedule.status === 1 ? (
              <>
                <Play size={14} className="text-primary" />
                Resume Schedule
              </>
            ) : (
              <>
                <Pause size={14} className="text-orange-500" />
                Pause Schedule
              </>
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={signingAction}
            className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold py-2.5 rounded-xl text-xs active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
          >
            <Trash2 size={14} />
            Cancel Schedule
          </button>
        </div>
      )}
    </div>
  );
}
