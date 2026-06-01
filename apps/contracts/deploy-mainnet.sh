#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.example and set PRIVATE_KEY"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source .env
set +a

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "PRIVATE_KEY is not set in .env"
  exit 1
fi

export CUSD_ADDRESS="${CUSD_ADDRESS:-0x765DE816845861e75A25fCA122bb6898B8B1282a}"
export CELO_RPC_URL="${CELO_RPC_URL:-https://forno.celo.org}"
export AGENT_ADDRESS="${AGENT_ADDRESS:-}"

echo "Deploying RemittanceContract to Celo network..."
echo "USDm/cUSD token: $CUSD_ADDRESS"

export ETHERSCAN_API_KEY="${ETHERSCAN_API_KEY:-}"

VERIFY_ARGS=()
if [[ -n "${ETHERSCAN_API_KEY}" ]]; then
  VERIFY_ARGS=(--verify --etherscan-api-key "$ETHERSCAN_API_KEY")
else
  echo "Tip: set ETHERSCAN_API_KEY in .env, then run ./verify-mainnet.sh after deploy"
fi

forge script script/RemittanceContract.s.sol:RemittanceContractScript \
  --rpc-url "$CELO_RPC_URL" \
  --broadcast \
  "${VERIFY_ARGS[@]}" \
  --private-key "$PRIVATE_KEY" \
  -vvvv

echo ""
echo "Deploy done. If verify failed, run: ./verify-mainnet.sh <contract_address>"
