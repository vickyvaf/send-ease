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

async function main() {
  loadEnv();
  const relayerPkRaw = process.env.RELAYER_PRIVATE_KEY as string;
  const agentPkRaw = process.env.AGENT_PRIVATE_KEY as string;
  
  if (!relayerPkRaw || !agentPkRaw) {
    console.error("Missing RELAYER_PRIVATE_KEY or AGENT_PRIVATE_KEY in .env.local");
    return;
  }
  
  const relayerPk = relayerPkRaw.startsWith("0x") ? relayerPkRaw : `0x${relayerPkRaw}`;
  const agentPk = agentPkRaw.startsWith("0x") ? agentPkRaw : `0x${agentPkRaw}`;
  
  const kit = newKit("https://forno.celo.org");
  kit.addAccount(relayerPk);
  kit.addAccount(agentPk);
  
  const relayerAddress = kit.web3.eth.accounts.privateKeyToAccount(relayerPk).address;
  const agentAddress = kit.web3.eth.accounts.privateKeyToAccount(agentPk).address;
  
  console.log("Relayer:", relayerAddress);
  console.log("Agent:", agentAddress);
  
  // 1. Transfer CELO and cUSD from Relayer to Agent
  kit.defaultAccount = relayerAddress;
  const goldToken = await kit.contracts.getGoldToken();
  const stableToken = await kit.contracts.getStableToken();
  
  console.log("Transferring 0.1 cUSD to Agent...");
  const cusdBalance = await stableToken.balanceOf(relayerAddress);
  if (cusdBalance.lt(kit.web3.utils.toBN(kit.web3.utils.toWei("0.1", "ether")))) {
      console.log("Not enough cUSD on relayer. Balance:", kit.web3.utils.fromWei(cusdBalance.toString()));
  } else {
      await stableToken.transfer(agentAddress, kit.web3.utils.toWei("0.1", "ether")).sendAndWaitForReceipt({ from: relayerAddress });
  }
  
  // 2. Buy ODIS Quota as Agent
  kit.defaultAccount = agentAddress;
  console.log("Agent buying ODIS Quota...");
  const odisPayments = await kit._web3Contracts.getOdisPayments();
  const odisPaymentsAddress = odisPayments.options.address;
  
  const fundAmount = kit.web3.utils.toWei("0.1", "ether");
  const agentCusd = await stableToken.balanceOf(agentAddress);
  
  if (agentCusd.lt(kit.web3.utils.toBN(fundAmount))) {
      console.log("Agent does not have enough cUSD to fund. Balance:", kit.web3.utils.fromWei(agentCusd.toString()));
      return;
  }

  await stableToken.approve(odisPaymentsAddress, fundAmount).sendAndWaitForReceipt({ from: agentAddress });
  
  const payTx = await odisPayments.methods.payInCUSD(agentAddress, fundAmount).send({
    from: agentAddress,
    gas: 300000
  });
  console.log("ODIS Quota funded! Tx hash:", payTx.transactionHash);
  
  // 3. Check Quota
  const odisContext = OdisUtils.Query.OdisContextName.MAINNET;
  const serviceContext = OdisUtils.Query.getServiceContext(odisContext, OdisUtils.Query.OdisAPI.PNP);
  const authSigner: any = {
    authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
    contractKit: kit as any,
  };
  
  const quotaStatus = await OdisUtils.Quota.getPnpQuotaStatus(
    agentAddress,
    authSigner,
    serviceContext
  );
  console.log("Agent ODIS Quota Status:", quotaStatus);
}

main().catch(console.error);
