#!/usr/bin/env bash
# Verify RemittanceContract on Celoscan (Etherscan API V2)
set -euo pipefail

cd "$(dirname "$0")"

CONTRACT_ADDRESS="${1:-}"
if [[ -z "$CONTRACT_ADDRESS" ]]; then
  echo "Usage: ./verify-mainnet.sh <contract_address>"
  exit 1
fi

CUSD_ADDRESS="${CUSD_ADDRESS:-0x765DE816845861e75A25fCA122bb6898B8B1282a}"
AGENT_ADDRESS="${AGENT_ADDRESS:-}"

if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

API_KEY="${ETHERSCAN_API_KEY:-}"
if [[ -z "$API_KEY" ]]; then
  echo "Set ETHERSCAN_API_KEY in .env"
  exit 1
fi

if [[ -z "$AGENT_ADDRESS" ]]; then
  echo "Set AGENT_ADDRESS in .env or as environment variable"
  exit 1
fi

export ETHERSCAN_API_KEY="$API_KEY"

CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address)" "$CUSD_ADDRESS" "$AGENT_ADDRESS")

echo "Verifying RemittanceContract at $CONTRACT_ADDRESS on Celo (chain 42220)..."

forge verify-contract \
  "$CONTRACT_ADDRESS" \
  src/RemittanceContract.sol:RemittanceContract \
  --chain-id 42220 \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  --constructor-args "$CONSTRUCTOR_ARGS" \
  --watch

echo "Done. Check https://celoscan.io/address/$CONTRACT_ADDRESS#code"
