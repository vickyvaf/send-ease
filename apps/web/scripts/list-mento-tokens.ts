import { Mento, ChainId } from "@mento-protocol/mento-sdk";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const mento = await Mento.create(ChainId.CELO);
  
  const stableTokens = await mento.tokens.getStableTokens();
  console.log("Mento Stable Tokens:");
  stableTokens.forEach(t => {
    console.log(`- ${t.symbol}: ${t.address}`);
  });

  const collateralAssets = await mento.tokens.getCollateralAssets();
  console.log("\nMento Collateral Assets:");
  collateralAssets.forEach(t => {
    console.log(`- ${t.symbol}: ${t.address}`);
  });
}

main().catch(console.error);
