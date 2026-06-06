"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { Plus, Calendar, Clock, ArrowRight, UserPlus, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UserBalance } from "@/components/user-balance";
import { SwapWidget } from "@/components/swap-widget";
import { REMITTANCE_ABI, REMITTANCE_ADDRESSES } from "@/lib/contracts";
import { truncateAddress, formatAmount } from "@/lib/app-utils";
import { useToast } from "@/context/toast-context";

interface RemittanceSchedule {
  id: number;
  owner: string;
  recipient: string;
  amount: number;
  frequency: number; // 0 = One-time, 1 = Weekly, 2 = Monthly
  startDate: number;
  nextExecutionTimestamp: number;
  hasMonthlyLimit: boolean;
  maxMonthlyAmount: number;
  currentMonthPaid: number;
  status: number; // 0 = Active, 1 = Paused, 2 = Cancelled, 3 = Completed
  recipientName: string;
  recipientPhone: string;
}

interface PaymentLog {
  scheduleId: number;
  recipient: string;
  amount: number;
  timestamp: string;
  txHash: string;
}

export default function Home() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { showToast } = useToast();

  const [schedules, setSchedules] = useState<RemittanceSchedule[]>([]);
  const [historyLogs, setHistoryLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(false);

  const chainId = chain?.id || 42220;
  const contractAddress = REMITTANCE_ADDRESSES[chainId as keyof typeof REMITTANCE_ADDRESSES] || REMITTANCE_ADDRESSES[42220];

  const fetchData = useCallback(async () => {
    if (!isConnected || !address || !publicClient) return;

    setLoading(true);
    try {
      // 1. Fetch schedules
      const count = (await publicClient.readContract({
        address: contractAddress,
        abi: REMITTANCE_ABI,
        functionName: "scheduleCount",
      })) as bigint;

      const list: RemittanceSchedule[] = [];
      for (let i = 1; i <= Number(count); i++) {
        try {
          const s = (await publicClient.readContract({
            address: contractAddress,
            abi: REMITTANCE_ABI,
            functionName: "getSchedule",
            args: [BigInt(i)],
          })) as any;

          // Only keep schedules belonging to the active user
          if (s.owner.toLowerCase() === address.toLowerCase()) {
            list.push({
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
            });
          }
        } catch (err) {
          console.error(`Error reading schedule ${i}`, err);
        }
      }
      setSchedules(list);

      // 2. Fetch PaymentExecuted logs from events
      try {
        const events = await publicClient.getContractEvents({
          address: contractAddress,
          abi: REMITTANCE_ABI,
          eventName: "PaymentExecuted",
          fromBlock: "earliest",
        });

        // Filter events belonging to user's schedules and map them
        const parsedLogs: PaymentLog[] = [];
        for (const ev of events) {
          const args = ev.args as any;
          if (args.owner.toLowerCase() === address.toLowerCase()) {
            // Find schedule details for recipientName
            const matchedSchedule = list.find((s) => s.id === Number(args.scheduleId));
            const recipientLabel = matchedSchedule ? matchedSchedule.recipientName : truncateAddress(args.recipient);

            // Get block details to find block time
            let timeStr = "Recently";
            try {
              const block = await publicClient.getBlock({ blockNumber: ev.blockNumber });
              timeStr = new Date(Number(block.timestamp) * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            } catch { }

            parsedLogs.push({
              scheduleId: Number(args.scheduleId),
              recipient: recipientLabel,
              amount: parseFloat(formatUnits(args.amount, 18)),
              timestamp: timeStr,
              txHash: ev.transactionHash,
            });
          }
        }
        // Show newest logs first
        setHistoryLogs(parsedLogs.reverse());
      } catch (errEvent) {
        console.error("Failed to query event logs", errEvent);
      }

    } catch (e: any) {
      const isContractNotDeployed = e instanceof Error && (
        e.message.includes("returned no data") ||
        e.message.includes("0x") ||
        e.message.includes("not a contract")
      );
      if (isContractNotDeployed) {
        console.warn(`RemittanceContract is not deployed at ${contractAddress} on chain ${chainId}.`);
        setSchedules([]);
      } else {
        console.error("Failed to load dashboard data", e);
        showToast("Failed to load on-chain remittance data", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, publicClient, contractAddress, showToast]);

  useEffect(() => {
    // Clear pending remittance draft when user leaves the creation flow and returns to dashboard
    localStorage.removeItem("sendease_pending_remittance");

    if (isConnected && address && publicClient) {
      fetchData();
    } else {
      setSchedules([]);
      setHistoryLogs([]);
    }
  }, [isConnected, address, publicClient, fetchData]);

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

  return (
    <div className="space-y-4">
      {/* Wallet Balance & copy */}
      <UserBalance />

      {/* Swap/Convert Widget */}
      <SwapWidget />

      {/* Quick Action Button */}
      {isConnected && (
        <Link href="/create" className="block">
          <Card className="border border-primary/20 bg-primary/5 rounded-2xl active:scale-[0.98] transition-transform">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
                <Plus className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Schedule Remittance</h3>
                <p className="text-xs text-muted-foreground">Setup new automated payment</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Active Schedules Checklist */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-foreground px-1">Active Remittances</h2>
        {loading ? (
          <div className="text-center py-6 text-sm text-muted-foreground animate-pulse">Loading schedules...</div>
        ) : schedules.length > 0 ? (
          <div className="space-y-3">
            {schedules.map((item) => (
              <Link href={`/schedule/${item.id}`} key={item.id} className="block">
                <Card className="border border-border rounded-xl hover:bg-primary/5 transition-colors">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{item.recipientName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold tracking-wider ${getStatusBadgeClass(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {getFrequencyLabel(item.frequency)}
                        </span>
                        {item.nextExecutionTimestamp > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Next: {new Date(item.nextExecutionTimestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-foreground">
                        ${formatAmount(item.amount)}
                      </div>
                      {item.hasMonthlyLimit && (
                        <div className="text-xs text-muted-foreground">
                          Limit: ${formatAmount(item.maxMonthlyAmount)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 bg-primary/[0.02] rounded-2xl border border-dashed border-primary/20">
            <UserPlus className="h-8 w-8 text-slate-400" />
            <p className="text-xs font-bold text-foreground">No remittances scheduled yet</p>
            <p className="text-xs text-muted-foreground">Create a scheduled payment.</p>
          </div>
        )}
      </div>

      {/* Recent Executions Logs */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-foreground px-1">Recent Activities</h2>
        {loading ? (
          <div className="text-center py-6 text-sm text-muted-foreground animate-pulse">Loading history...</div>
        ) : historyLogs.length > 0 ? (
          <div className="space-y-2">
            {historyLogs.slice(0, 5).map((log, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 border border-border rounded-xl bg-white text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-50 text-[#09955F] p-1.5 rounded-lg">
                    <FileText size={14} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Sent to {log.recipient}</p>
                    <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="font-bold text-foreground">
                    +${formatAmount(log.amount)}
                  </p>
                  <a
                    href={`https://celoscan.io/tx/${log.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#09955F] hover:underline block"
                  >
                    View Tx
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-primary/[0.02] rounded-xl border border-dashed border-primary/20">
            <p className="text-xs text-muted-foreground">No automated payments executed yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
