import { newKit } from "@celo/contractkit";
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
          if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
          process.env[key] = value;
        }
      });
    }
  } catch (e) {}
}

async function main() {
  loadEnv();
  const agentPk = process.env.AGENT_PRIVATE_KEY;
  if (!agentPk) {
    console.log("No AGENT_PRIVATE_KEY");
    return;
  }
  const pk = agentPk.startsWith("0x") ? agentPk : `0x${agentPk}`;
  const kit = newKit("https://forno.celo.org");
  kit.addAccount(pk);
  const address = kit.connection.getLocalAccounts()[0];
  
  const balances = await kit.getTotalBalance(address);
  console.log("Agent Address:", address);
  console.log("Agent Balances:", {
    CELO: kit.web3.utils.fromWei(balances.CELO?.toString() || "0"),
    cUSD: kit.web3.utils.fromWei(balances.cUSD?.toString() || "0"),
  });
}

main().catch(console.error);
