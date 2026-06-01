export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

function trimTrailingZeros(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "");
}

export function formatAmount(amount: number | string, maxDecimals = 6): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return "0";

  const abs = Math.abs(num);
  let decimals: number;

  if (abs >= 1) {
    decimals = Math.min(maxDecimals, 2);
  } else if (abs >= 0.01) {
    decimals = Math.min(maxDecimals, 4);
  } else {
    decimals = Math.min(
      maxDecimals,
      Math.max(2, Math.ceil(-Math.log10(abs)) + 1)
    );
  }

  return trimTrailingZeros(num.toFixed(decimals));
}

export function truncateAddress(address: string, startLength = 6, endLength = 4): string {
  if (address.length <= startLength + endLength) {
    return address;
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
