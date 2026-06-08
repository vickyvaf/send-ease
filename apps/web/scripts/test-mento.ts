import { Mento, ChainId } from "@mento-protocol/mento-sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, "../.env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value;
        }
      });
    }
  } catch (e) { console.error("Error loading env:", e); }
}

async function main() {
  loadEnv();
  
  // Test with ChainId number
  const mento = await Mento.create(ChainId.CELO);
  console.log("Mento instance created successfully!");
  
  const pools = await mento.pools.getPools();
  console.log("Number of pools:", pools.length);
  
  if (pools.length > 0) {
    console.log("Sample pool:", pools[0]);
  }
}

main().catch(console.error);
