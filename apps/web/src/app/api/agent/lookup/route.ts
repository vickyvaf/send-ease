import { NextResponse } from "next/server";
import { OdisUtils } from "@celo/identity";
import { newKit } from "@celo/contractkit";
import type { AuthSigner } from "@celo/identity/lib/odis/query";

// MiniPay official issuer
const MINIPAY_ISSUER = "0x7888612486844Bb9BE598668081c59A9f7367FBc";
// Sendease relayer — used as issuer for self-registered attestations
const RELAYER_ISSUER = process.env.AGENT_WALLET_ADDRESS || "0x6599d6E7af6b13A2fCa80C7CA2035a94eE913293";

export async function POST(request: Request) {
  try {
    let { phoneNumber } = await request.json();
    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: "Phone number is required" }, { status: 400 });
    }

    // Sanitize phone number (remove spaces, dashes, parentheses)
    phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");

    // Phone number must start with + and be E.164 compliant
    if (!phoneNumber.startsWith("+") || phoneNumber.length < 8) {
      return NextResponse.json({
        success: false,
        error: "Invalid phone number format. Must be in E.164 format (e.g. +628123456789)"
      }, { status: 400 });
    }

    const privateKey = (process.env.AGENT_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) as string;
    if (!privateKey) {
      return NextResponse.json({ success: false, error: "Agent private key is not configured" }, { status: 503 });
    }

    // Force Celo Mainnet for ODIS lookups as real phone-to-address mappings only exist on Mainnet
    const chainId = 42220;
    const odisContext = OdisUtils.Query.OdisContextName.MAINNET;
    const rpcUrl = process.env.CELO_RPC_URL || "https://forno.celo.org";

    const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    const kit = newKit(rpcUrl);
    kit.addAccount(pk);
    const locals = kit.connection.getLocalAccounts();
    if (!locals.length) {
      return NextResponse.json({ success: false, error: "Failed to initialize Celo account from private key" }, { status: 500 });
    }
    kit.defaultAccount = locals[0];
    const quotaAccount = locals[0];

    const serviceContext = OdisUtils.Query.getServiceContext(odisContext, OdisUtils.Query.OdisAPI.PNP);

    const authSigner: any = {
      authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
      contractKit: kit as any,
    };

    console.log(`Performing ODIS lookup for phone: ${phoneNumber} using account: ${quotaAccount} on Mainnet`);

    let obfuscatedIdentifier: string;
    try {
      const response = await OdisUtils.Identifier.getObfuscatedIdentifier(
        phoneNumber,
        OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
        quotaAccount,
        authSigner,
        serviceContext,
      );
      obfuscatedIdentifier = response.obfuscatedIdentifier;
    } catch (odisErr: any) {
      const errMsg = odisErr?.message || String(odisErr);
      console.error("ODIS getObfuscatedIdentifier failed:", odisErr);

      // Detect quota error — the relayer wallet has no ODIS quota.
      // This means the relayer cUSD balance needs to be topped up and
      // fund-odis-quota.js must be run to buy quota from OdisPayments contract.
      if (errMsg.includes("odisQuotaError") || errMsg.includes("quota")) {
        return NextResponse.json({
          success: false,
          error: "ODIS_QUOTA_EMPTY",
          message: "Phone number lookup is temporarily unavailable. The lookup service requires cUSD funding. Please run: node src/scripts/fund-odis-quota.js after sending 0.1 cUSD to the relayer.",
        }, { status: 503 });
      }

      return NextResponse.json({
        success: false,
        error: `ODIS lookup failed: ${errMsg}`
      }, { status: 500 });
    }


    try {
      const federated = await kit.contracts.getFederatedAttestations();

      // Query both MiniPay issuer AND our relayer (for self-registered attestations)
      const trustedIssuers = [MINIPAY_ISSUER, RELAYER_ISSUER];
      const { accounts, issuedOns } = await federated.lookupAttestations(obfuscatedIdentifier, trustedIssuers);

      let resolvedAddress: string | null = null;
      if (accounts.length > 0) {
        // Pick the most recently issued attestation (largest issuedOn timestamp)
        let latestIdx = 0;
        for (let i = 1; i < issuedOns.length; i++) {
          if (BigInt(issuedOns[i]) > BigInt(issuedOns[latestIdx])) latestIdx = i;
        }
        resolvedAddress = accounts[latestIdx];
        console.log(`Found ${accounts.length} attestation(s). Using latest (idx=${latestIdx}): ${resolvedAddress}`);
      }

      console.log(`ODIS lookup completed. Resolved address: ${resolvedAddress}`);

      return NextResponse.json({
        success: true,
        phoneNumber,
        walletAddress: resolvedAddress,
      });
    } catch (attestationErr: any) {
      console.error("FederatedAttestations lookup failed:", attestationErr);
      return NextResponse.json({
        success: false,
        error: `Attestation registry lookup failed: ${attestationErr.message || attestationErr}`
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error("Internal error in lookup API:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Internal server error"
    }, { status: 500 });
  }
}
