import { newKit } from "@celo/contractkit";
import { OdisUtils } from "@celo/identity";

async function main() {
  const kit = newKit("https://forno.celo.org");
  const account = kit.web3.eth.accounts.create();
  console.log("New Account Address:", account.address);
  console.log("New Account Private Key:", account.privateKey);

  kit.addAccount(account.privateKey);
  
  const odisContext = OdisUtils.Query.OdisContextName.MAINNET;
  const serviceContext = OdisUtils.Query.getServiceContext(odisContext, OdisUtils.Query.OdisAPI.PNP);
  const authSigner: any = {
    authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
    contractKit: kit as any,
  };
  
  try {
    const quotaStatus = await OdisUtils.Quota.getPnpQuotaStatus(
      account.address,
      authSigner,
      serviceContext
    );
    console.log("Quota Status for new account:", quotaStatus);
  } catch (err) {
    console.error("Error fetching quota:", err);
  }
}

main().catch(console.error);
