import { newKit } from "@celo/contractkit";

async function main() {
  const kit = newKit("https://forno.celo.org");
  const txHash = "0x6553ab50524214cb5c82f0deb8838e6e9c217604df4b831e2588b51a72dc8608";
  const receipt = await kit.web3.eth.getTransactionReceipt(txHash);
  console.log("Status:", receipt.status);
  console.log("Logs:", receipt.logs.length);
  // Decode ERC20 Transfer events
  const transferSignature = kit.web3.eth.abi.encodeEventSignature('Transfer(address,address,uint256)');
  for (const log of receipt.logs) {
    if (log.topics[0] === transferSignature) {
      console.log(`Transfer from ${kit.web3.eth.abi.decodeParameter('address', log.topics[1])} to ${kit.web3.eth.abi.decodeParameter('address', log.topics[2])}: ${kit.web3.utils.fromWei(kit.web3.eth.abi.decodeParameter('uint256', log.data || "0x0").toString())}`);
    }
  }
}

main().catch(console.error);
