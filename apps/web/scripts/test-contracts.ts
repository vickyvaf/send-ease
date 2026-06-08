import { newKit } from "@celo/contractkit";

const FACTORY_ADDRESS = "0xAfE208a311B21f13EF87E33A90049fC17A7acDEc";
const CELO = "0x471ECE3750Da237f93B8E2992150489f15927438"; // Corrected ending to 438
const CUSD = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

const FACTORY_ABI = [
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" }
    ],
    name: "getPool",
    outputs: [{ name: "pool", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
];

async function main() {
  const kit = newKit("https://forno.celo.org");
  const factory = new kit.web3.eth.Contract(FACTORY_ABI as any, kit.web3.utils.toChecksumAddress(FACTORY_ADDRESS));
  
  const celoCheck = kit.web3.utils.toChecksumAddress(CELO);
  const cusdCheck = kit.web3.utils.toChecksumAddress(CUSD);
  
  console.log("CELO Checksummed:", celoCheck);
  console.log("cUSD Checksummed:", cusdCheck);
  
  const fees = [100, 500, 3000, 10000];
  for (const fee of fees) {
    const pool = await factory.methods.getPool(celoCheck, cusdCheck, fee).call();
    console.log(`Fee: ${fee}, Pool: ${pool}`);
  }
}

main().catch(console.error);
