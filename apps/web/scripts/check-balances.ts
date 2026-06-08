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
  const privateKey = (process.env.AGENT_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) as string;
  const kit = newKit("https://forno.celo.org");
  const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  kit.addAccount(pk);
  const address = kit.connection.getLocalAccounts()[0];
  kit.defaultAccount = address;
  
  console.log("Relayer Address:", address);
  
  const balances = await kit.getTotalBalance(address);
  console.log("cUSD Balance:", kit.web3.utils.fromWei(balances.cUSD?.toString() || "0"));
  console.log("CELO Balance:", kit.web3.utils.fromWei(balances.CELO?.toString() || "0"));
}

main().catch(console.error);
