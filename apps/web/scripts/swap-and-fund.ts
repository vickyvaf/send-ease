import { newKit } from "@celo/contractkit";
import { OdisUtils } from "@celo/identity";
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

const UBESWAP_ROUTER = "0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121";

const UBESWAP_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "amountIn", "type": "uint256" },
      { "name": "amountOutMin", "type": "uint256" },
      { "name": "path", "type": "address[]" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [{ "name": "amounts", "type": "uint256[]" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function main() {
  loadEnv();
  const privateKey = (process.env.AGENT_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) as string;
  const kit = newKit("https://forno.celo.org");
  const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  kit.addAccount(pk);
  const address = kit.connection.getLocalAccounts()[0];
  kit.defaultAccount = address;
  
  const balances = await kit.getTotalBalance(address);
  let cusdBalance = balances.cUSD || kit.web3.utils.toBN("0");
  const minCusdNeeded = kit.web3.utils.toBN(kit.web3.utils.toWei("0.2", "ether"));
  
  if (cusdBalance.lt(minCusdNeeded)) {
    console.log("cUSD balance is low, swapping 5 CELO to cUSD via Ubeswap...");
    try {
      const goldToken = await kit.contracts.getGoldToken();
      const stableToken = await kit.contracts.getStableToken();
      
      const celoAddress = goldToken.address;
      const cusdAddress = stableToken.address;
      
      const amountIn = kit.web3.utils.toWei("5", "ether"); // Swap 5 CELO to overcome low liquidity
      
      console.log(`Approving Ubeswap router to spend CELO...`);
      const approveTx = await goldToken.approve(UBESWAP_ROUTER, amountIn).send({ from: address });
      await approveTx.waitReceipt();
      
      const routerContract = new kit.web3.eth.Contract(UBESWAP_ABI as any, UBESWAP_ROUTER);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      
      console.log("Executing swapExactTokensForTokens...");
      const receipt = await routerContract.methods.swapExactTokensForTokens(
        amountIn,
        0, 
        [celoAddress, cusdAddress],
        address,
        deadline
      ).send({ from: address, gas: 500000 });
      
      console.log("Swap successful! Tx hash:", receipt.transactionHash);
      
      const updatedBalances = await kit.getTotalBalance(address);
      cusdBalance = updatedBalances.cUSD || kit.web3.utils.toBN("0");
      console.log("New cUSD balance:", kit.web3.utils.fromWei(cusdBalance.toString()));
    } catch (err) {
      console.error("Failed to swap via Ubeswap:", err);
      return;
    }
  }
  
  // Buy ODIS Quota
  try {
    const odisPayments = await kit._web3Contracts.getOdisPayments();
    const odisPaymentsAddress = odisPayments.options.address;
    
    const stableToken = await kit.contracts.getStableToken();
    const fundAmount = kit.web3.utils.toWei("0.15", "ether");
    
    console.log(`Approving ${kit.web3.utils.fromWei(fundAmount)} cUSD to OdisPayments...`);
    const approveCusdTx = await stableToken.approve(odisPaymentsAddress, fundAmount).send({ from: address });
    await approveCusdTx.waitReceipt();
    
    console.log(`Funding ODIS quota for account ${address} with ${kit.web3.utils.fromWei(fundAmount)} cUSD...`);
    const payTx = await odisPayments.methods.payInCUSD(address, fundAmount).send({
      from: address,
      gas: 300000
    });
    console.log("ODIS Quota funded successfully! Tx hash:", payTx.transactionHash);
    
    // Verify new quota status
    const odisContext = OdisUtils.Query.OdisContextName.MAINNET;
    const serviceContext = OdisUtils.Query.getServiceContext(odisContext, OdisUtils.Query.OdisAPI.PNP);
    const authSigner: any = {
      authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
      contractKit: kit as any,
    };
    
    const quotaStatus = await OdisUtils.Quota.getPnpQuotaStatus(
      address,
      authSigner,
      serviceContext
    );
    console.log("New ODIS Quota Status:", quotaStatus);
  } catch (err) {
    console.error("Failed to fund ODIS quota:", err);
  }
}

main().catch(console.error);
