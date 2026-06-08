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

async function main() {
  loadEnv();
  const privateKey = (process.env.AGENT_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) as string;
  const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const kit = newKit("https://forno.celo.org");
  kit.addAccount(pk);
  const address = kit.connection.getLocalAccounts()[0];
  kit.defaultAccount = address;
  
  console.log("Relayer Address:", address);
  
  try {
    const exchange = await kit.contracts.getExchange();
    const goldToken = await kit.contracts.getGoldToken();
    const stableToken = await kit.contracts.getStableToken();
    
    const amountToSell = kit.web3.utils.toWei("0.5", "ether");
    
    // Check quote
    const quote = await exchange.quoteGoldSell(amountToSell);
    console.log(`0.5 CELO = ${kit.web3.utils.fromWei(quote.toString())} cUSD`);
    
    console.log("Approving Exchange contract...");
    const approveTx = await goldToken.approve(exchange.address, amountToSell).send({ from: address });
    await approveTx.waitReceipt();
    console.log("Approved!");
    
    console.log("Swapping CELO for cUSD via native Exchange...");
    // swap CELO for cUSD
    const swapTx = await exchange.sellGold(amountToSell, kit.web3.utils.toBN(0)).send({ from: address });
    const receipt = await swapTx.waitReceipt();
    console.log("Swap successful! Tx hash:", receipt.transactionHash);
    
    const balances = await kit.getTotalBalance(address);
    console.log("New cUSD balance:", kit.web3.utils.fromWei(balances.cUSD?.toString() || "0"));
  } catch (err) {
    console.error("Exchange error:", err);
  }
}

main().catch(console.error);
