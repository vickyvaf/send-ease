import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";
import { REMITTANCE_ABI, REMITTANCE_ADDRESSES } from "@/lib/contracts";

export async function GET(request: Request) {
  return executeScheduler();
}

export async function POST(request: Request) {
  return executeScheduler();
}

async function executeScheduler() {
  const privateKey = (process.env.AGENT_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) as Hex;
  if (!privateKey) {
    return NextResponse.json({ success: false, error: "Agent private key is not configured" }, { status: 503 });
  }

  const envChainId = process.env.NEXT_PUBLIC_CHAIN_ID || "42220";
  const chainId = parseInt(envChainId, 10);
  const chain = chainId === 11142220 ? celoSepolia : celo;

  const rpcUrl =
    process.env.CELO_RPC_URL ||
    process.env.NEXT_PUBLIC_CELO_RPC_URL ||
    chain.rpcUrls.default.http[0];

  const contractAddress = REMITTANCE_ADDRESSES[chainId as keyof typeof REMITTANCE_ADDRESSES] || REMITTANCE_ADDRESSES[42220];

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  try {
    const scheduleCount = (await publicClient.readContract({
      address: contractAddress,
      abi: REMITTANCE_ABI,
      functionName: "scheduleCount",
    })) as bigint;

    const executedSchedules = [];
    const failedSchedules = [];
    const skippedSchedules = [];

    const currentBlock = await publicClient.getBlock();
    const currentBlockTime = currentBlock.timestamp;

    for (let id = 1; id <= Number(scheduleCount); id++) {
      try {
        const schedule = (await publicClient.readContract({
          address: contractAddress,
          abi: REMITTANCE_ABI,
          functionName: "getSchedule",
          args: [BigInt(id)],
        })) as any;

        const isActive = schedule.status === 0;
        const isDue = currentBlockTime >= schedule.nextExecutionTimestamp;

        if (isActive && isDue) {
          console.log(`Executing schedule ID: ${id} (recipient: ${schedule.recipientName})`);
          try {
            const hash = await walletClient.writeContract({
              address: contractAddress,
              abi: REMITTANCE_ABI,
              functionName: "executeScheduledPayment",
              args: [BigInt(id)],
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            executedSchedules.push({
              id,
              recipient: schedule.recipientName,
              txHash: hash,
              blockNumber: receipt.blockNumber.toString(),
            });
          } catch (execErr: any) {
            console.error(`Execution failed for schedule ID: ${id}`, execErr.message);
            failedSchedules.push({
              id,
              recipient: schedule.recipientName,
              error: execErr.message,
            });
          }
        } else {
          skippedSchedules.push({
            id,
            recipient: schedule.recipientName,
            reason: !isActive ? "Not active" : "Not due yet",
          });
        }
      } catch (readErr: any) {
        console.error(`Failed to read schedule ID: ${id}`, readErr.message);
        failedSchedules.push({ id, error: `Read failed: ${readErr.message}` });
      }
    }

    return NextResponse.json({
      success: true,
      blockTime: currentBlockTime.toString(),
      executedCount: executedSchedules.length,
      executedSchedules,
      failedSchedules,
      skippedSchedules,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Scheduler loop error" },
      { status: 500 }
    );
  }
}
