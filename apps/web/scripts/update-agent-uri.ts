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
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "agentURI", type: "string" },
    ],
    name: "setAgentURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

async function main() {
  loadEnv();

  const AGENT_ID = process.env.AGENT_ID ? BigInt(process.env.AGENT_ID) : 9200n;

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
  console.log(`Starting Agent URI Update on ${chain.name} (${chain.id})`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Agent Wallet Address: ${account.address}`);
  console.log(`Identity Registry Contract: ${REGISTRY_ADDRESS}`);
  console.log(`Agent ID (Token ID): ${AGENT_ID.toString()}`);

  let agentJsonPath = path.resolve(process.cwd(), "public/agent.json");
  if (!fs.existsSync(agentJsonPath)) {
    agentJsonPath = path.resolve(process.cwd(), "apps/web/public/agent.json");
  }

  if (!fs.existsSync(agentJsonPath)) {
    console.error(`❌ Could not find agent.json at: ${agentJsonPath}`);
    process.exit(1);
  }

  console.log(`Reading metadata from: ${agentJsonPath}`);
  const metadataContent = fs.readFileSync(agentJsonPath, "utf-8");
  const metadataObj = JSON.parse(metadataContent);

  const envAgentId = process.env.AGENT_ID ? parseInt(process.env.AGENT_ID, 10) : undefined;
  if (envAgentId !== undefined && !isNaN(envAgentId)) {
    if (metadataObj.registrations) {
      metadataObj.registrations = metadataObj.registrations.map((r: any) => ({
        ...r,
        agentId: envAgentId,
      }));
    }
  }

  let agentWalletAddress = process.env.AGENT_WALLET_ADDRESS;
  if (!agentWalletAddress) {
    const privateKey = (process.env.AGENT_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) as Hex;
    if (privateKey) {
      const account = privateKeyToAccount(privateKey);
      agentWalletAddress = account.address;
    }
  }

  if (agentWalletAddress && metadataObj.endpoints) {
    metadataObj.endpoints = metadataObj.endpoints.map((e: any) => {
      if (e.type === "wallet") {
        return {
          ...e,
          address: agentWalletAddress,
        };
      }
      return e;
    });
  }

  const minifiedJson = JSON.stringify(metadataObj);
  const base64Metadata = Buffer.from(minifiedJson).toString("base64");
  const dataURI = `data:application/json;base64,${base64Metadata}`;

  console.log(`Data URI Length: ${dataURI.length} characters`);
  console.log("----------------------------------------");

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  console.log("Submitting URI update transaction...");
  try {
    const hash = await walletClient.writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setAgentURI",
      args: [AGENT_ID, dataURI],
    });

    console.log(`Transaction Hash: ${hash}`);
    console.log("Waiting for block confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction successfully confirmed!");
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);

    console.log("Agent URI updated successfully on Celo Mainnet!");
  } catch (err) {
    console.error("❌ Failed to update agent URI:", err);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected script execution error:", err);
  process.exit(1);
});
