import { NextResponse } from "next/server";
import { OdisUtils } from "@celo/identity";
import { newKit } from "@celo/contractkit";
import type { AuthSigner } from "@celo/identity/lib/odis/query";

const MINIPAY_ISSUER = "0x7888612486844Bb9BE598668081c59A9f7367FBc";

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

    const envChainId = process.env.NEXT_PUBLIC_CHAIN_ID || "42220";
    const chainId = parseInt(envChainId, 10);

    // Select context name based on chain ID
    // 42220 is Celo Mainnet. Others (Sepolia, Alfajores) use Alfajores context.
    const isMainnet = chainId === 42220;
    const odisContext = isMainnet
      ? OdisUtils.Query.OdisContextName.MAINNET
      : OdisUtils.Query.OdisContextName.ALFAJORES;

    const rpcUrl =
      process.env.CELO_RPC_URL ||
      process.env.NEXT_PUBLIC_CELO_RPC_URL ||
      (isMainnet ? "https://forno.celo.org" : "https://alfajores-forno.celo-testnet.org");

    const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    const kit = newKit(rpcUrl);
    kit.addAccount(pk);
    const locals = kit.connection.getLocalAccounts();
    if (!locals.length) {
      return NextResponse.json({ success: false, error: "Failed to initialize Celo account from private key" }, { status: 500 });
    }
    kit.defaultAccount = locals[0];
    const quotaAccount = locals[0];

    // Define correct service context. The SDK's built-in Alfajores URL is deprecated/offline.
    const serviceContext = isMainnet
      ? OdisUtils.Query.getServiceContext(odisContext, OdisUtils.Query.OdisAPI.PNP)
      : {
          odisUrl: "https://us-central1-celo-phone-number-privacy.cloudfunctions.net",
          odisPubKey: "kPoRxWdEdZ/Nd3uQnp3FJFs54zuiS+ksqvOm9x8vY6KHPG8jrfqysvIRU0wtqYsBKA7SoAsICMBv8C/Fb2ZpDOqhSqvr/sZbZoHmQfvbqrzbtDIPvUIrHgRS0ydJCMsA",
        };

    const authSigner: any = {
      authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
      contractKit: kit as any,
    };

    console.log(`Performing ODIS lookup for phone: ${phoneNumber} using account: ${quotaAccount} on context: ${odisContext}`);

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
      console.error("ODIS getObfuscatedIdentifier failed:", odisErr);

      // Fallback for development/testing if relayer has no ODIS quota or lookup fails
      const isDev = process.env.NODE_ENV === "development" || rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1") || rpcUrl.includes("vercel.app") || rpcUrl.includes("netlify.app");
      if (isDev) {
        console.log("ODIS lookup failed, using deterministic fallback address for development/testing.");
        const crypto = require("crypto");
        const hash = crypto.createHash("sha256").update(phoneNumber).digest("hex");
        const mockAddress = `0x${hash.slice(0, 40)}`;
        return NextResponse.json({
          success: true,
          phoneNumber,
          walletAddress: mockAddress,
          isMock: true,
          warning: "Using fallback address for testing (ODIS quota limit)."
        });
      }

      return NextResponse.json({
        success: false,
        error: `ODIS lookup failed: ${odisErr.message || odisErr}`
      }, { status: 500 });
    }

    try {
      const federated = await kit.contracts.getFederatedAttestations();
      const { accounts } = await federated.lookupAttestations(obfuscatedIdentifier, [MINIPAY_ISSUER]);
      const resolvedAddress = accounts[0] || null;

      console.log(`ODIS lookup completed. Resolved address: ${resolvedAddress}`);

      if (!resolvedAddress) {
        // Fallback for development/testing if number is not registered on MiniPay
        const isDev = process.env.NODE_ENV === "development" || rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1") || rpcUrl.includes("vercel.app") || rpcUrl.includes("netlify.app");
        if (isDev) {
          console.log("Phone number not registered on MiniPay. Using deterministic mock address for development/testing.");
          const crypto = require("crypto");
          const hash = crypto.createHash("sha256").update(phoneNumber).digest("hex");
          const mockAddress = `0x${hash.slice(0, 40)}`;
          return NextResponse.json({
            success: true,
            phoneNumber,
            walletAddress: mockAddress,
            isMock: true,
            warning: "Mock address generated (Phone number not registered on MiniPay)."
          });
        }
      }

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
