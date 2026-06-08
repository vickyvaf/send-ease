import { newKit } from "@celo/contractkit";
import { OdisUtils } from "@celo/identity";
import * as fs from "fs";
import * as path from "path";

// Simple env file parser
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
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          process.env[key] = value;
        }
      });
    }
  } catch (e) {
    console.error("Error loading env:", e);
  }
}

async function checkQuota() {
  loadEnv();
  
  const privateKey = (process.env.AGENT_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) as string;
  if (!privateKey) {
    console.error("No private key found in env!");
    return;
  }
  
  const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const kit = newKit("https://forno.celo.org");
  kit.addAccount(pk);
  const locals = kit.connection.getLocalAccounts();
  const address = locals[0];
  kit.defaultAccount = address;
  
  console.log("Checking quota for address:", address);
  
  // Check CELO & cUSD balances
  const celoBalance = await kit.getTotalBalance(address);
  console.log("Balances:", {
    CELO: celoBalance.CELO?.toString(),
    cUSD: celoBalance.cUSD?.toString(),
  });
  
  const odisContext = OdisUtils.Query.OdisContextName.MAINNET;
  const serviceContext = OdisUtils.Query.getServiceContext(odisContext, OdisUtils.Query.OdisAPI.PNP);
  
  const authSigner: any = {
    authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
    contractKit: kit as any,
  };
  
  try {
    const quotaStatus = await OdisUtils.Quota.getPnpQuotaStatus(
      address,
      authSigner,
      serviceContext
    );
    console.log("ODIS Quota Status:", quotaStatus);
  } catch (err) {
    console.error("Failed to get ODIS Quota Status:", err);
  }
}

checkQuota().catch(console.error);
