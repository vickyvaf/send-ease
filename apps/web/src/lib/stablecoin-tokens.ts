import { formatUnits, parseUnits } from "viem";

export type StablecoinSymbol = "USDm" | "USDC" | "USDT";

export interface StablecoinToken {
  symbol: StablecoinSymbol;
  address: `0x${string}`;
  decimals: number;
  accent: string;
  iconBg: string;
}

const CELO_MAINNET_TOKENS: StablecoinToken[] = [
  {
    symbol: "USDC",
    address: (process.env.NEXT_PUBLIC_USDC_ADDRESS_MAINNET || "0xcebA9300f2b948710d2653dD7B07f33A8B32118C") as `0x${string}`,
    decimals: 6,
    accent: "#2775CA",
    iconBg: "#3B82F6",
  },
  {
    symbol: "USDm",
    address: (process.env.NEXT_PUBLIC_USDM_ADDRESS_MAINNET || "0x765DE816845861e75A25fCA122bb6898B8B1282a") as `0x${string}`,
    decimals: 18,
    accent: "#09955F",
    iconBg: "#D1FAE5",
  },
  {
    symbol: "USDT",
    address: (process.env.NEXT_PUBLIC_USDT_ADDRESS_MAINNET || "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e") as `0x${string}`,
    decimals: 6,
    accent: "#26A17B",
    iconBg: "#2DD4A0",
  },
];

const CELO_SEPOLIA_TOKENS: StablecoinToken[] = [
  {
    symbol: "USDC",
    address: (process.env.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA || "0x01C5C0122039549AD1493B8220cABEdD739BC44E") as `0x${string}`,
    decimals: 6,
    accent: "#2775CA",
    iconBg: "#3B82F6",
  },
  {
    symbol: "USDm",
    address: (process.env.NEXT_PUBLIC_USDM_ADDRESS_SEPOLIA || "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b") as `0x${string}`,
    decimals: 18,
    accent: "#09955F",
    iconBg: "#D1FAE5",
  },
  {
    symbol: "USDT",
    address: (process.env.NEXT_PUBLIC_USDT_ADDRESS_SEPOLIA || "0xd077A400968890Eacc75cdc901F0356c943e4fDb") as `0x${string}`,
    decimals: 6,
    accent: "#26A17B",
    iconBg: "#2DD4A0",
  },
];

const ALFAJORES_TOKENS: StablecoinToken[] = [
  {
    symbol: "USDC",
    address: (process.env.NEXT_PUBLIC_USDC_ADDRESS_ALFAJORES || "0x62e8f1Efd5F560ae77366E500Ed9350b9a324b4F") as `0x${string}`,
    decimals: 6,
    accent: "#2775CA",
    iconBg: "#3B82F6",
  },
  {
    symbol: "USDm",
    address: (process.env.NEXT_PUBLIC_USDM_ADDRESS_ALFAJORES || "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1") as `0x${string}`,
    decimals: 18,
    accent: "#09955F",
    iconBg: "#D1FAE5",
  },
  {
    symbol: "USDT",
    address: (process.env.NEXT_PUBLIC_USDT_ADDRESS_ALFAJORES || "0x198E26C0bC9A0F8395D10dE6271Fa36Fe4f8cB9A") as `0x${string}`,
    decimals: 6,
    accent: "#26A17B",
    iconBg: "#2DD4A0",
  },
];

const TOKENS_BY_CHAIN_ID: Record<number, StablecoinToken[]> = {
  42220: CELO_MAINNET_TOKENS,
  11142220: CELO_SEPOLIA_TOKENS,
  44787: ALFAJORES_TOKENS,
};

export const SUPPORTED_STABLECOIN_CHAIN_IDS = Object.keys(TOKENS_BY_CHAIN_ID).map(Number);

export function getStablecoinTokens(chainId?: number): StablecoinToken[] {
  if (chainId && TOKENS_BY_CHAIN_ID[chainId]) {
    return TOKENS_BY_CHAIN_ID[chainId];
  }
  return CELO_MAINNET_TOKENS;
}

export function parseContractBalance(entry: unknown, decimals: number): number {
  if (entry == null) return 0;

  let raw: unknown;
  if (typeof entry === "bigint") {
    raw = entry;
  } else if (
    typeof entry === "object" &&
    "status" in entry &&
    (entry as { status: string }).status === "success" &&
    "result" in entry
  ) {
    raw = (entry as { result: unknown }).result;
  } else {
    return 0;
  }

  if (typeof raw !== "bigint") return 0;
  return parseFloat(formatUnits(raw, decimals));
}

export function getTokenBySymbol(
  tokens: StablecoinToken[],
  symbol: StablecoinSymbol
): StablecoinToken {
  const token = tokens.find((t) => t.symbol === symbol);
  if (!token) throw new Error(`Unknown token: ${symbol}`);
  return token;
}

export function parsePaymentAmountToWei(
  amountUsd: number | string,
  decimals: number
): bigint {
  const num = typeof amountUsd === "string" ? parseFloat(amountUsd) : amountUsd;
  if (!num || num <= 0) return 0n;
  return parseUnits(num.toFixed(decimals), decimals);
}

export const PAYMENT_TOKEN_ORDER: readonly StablecoinSymbol[] = [
  "USDC",
  "USDm",
  "USDT",
];

export function amountUsdToTokenWei(
  amountUsd: number,
  decimals: number
): bigint {
  if (!amountUsd || amountUsd <= 0) return 0n;
  return parsePaymentAmountToWei(amountUsd, decimals);
}
