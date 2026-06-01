import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import fs from "fs";
import path from "path";

function loadEnv() {
  let envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    envPath = path.resolve(process.cwd(), "apps/web", ".env.local");
  }
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

const REGISTRY_ADDRESS = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as `0x${string}`;

const REGISTRY_ABI = [
  {
    inputs: [{ name: "agentURI", type: "string" }],
    name: "register",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

async function main() {
  loadEnv();

  const chain = celo;
  const rpcUrl =
    process.env.CELO_RPC_URL ||
    process.env.NEXT_PUBLIC_CELO_RPC_URL ||
    chain.rpcUrls.default.http[0];

  const privateKey = (process.env.AGENT_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) as Hex;
  if (!privateKey) {
    console.error("❌ AGENT_PRIVATE_KEY or RELAYER_PRIVATE_KEY is not defined in .env.local");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);

  console.log("----------------------------------------");
  console.log(`Starting Agent Registration on ${chain.name} (${chain.id})`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Agent Wallet Address: ${account.address}`);
  console.log(`Identity Registry Contract: ${REGISTRY_ADDRESS}`);

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://send-ease.vercel.app";
  const agentURI = `${baseUrl}/api/agent/profile`;
  console.log(`Metadata URI (agentURI): ${agentURI}`);
  console.log("----------------------------------------");

  console.log("Submitting registration transaction...");
  try {
    const hash = await walletClient.writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "register",
      args: [agentURI],
    });

    console.log(`Transaction Hash: ${hash}`);
    console.log("Waiting for block confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction successfully confirmed!");

    console.log("Agent registered successfully on Mainnet!");
    console.log("Check transaction on CeloScan:");
    const blockExplorerUrl = "https://celoscan.io";
    console.log(`${blockExplorerUrl}/tx/${hash}`);
  } catch (err) {
    console.error("❌ Failed to register agent:", err);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected script execution error:", err);
  process.exit(1);
});
