import { createPublicClient, createWalletClient, http, type Hex, formatUnits, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";
import { REMITTANCE_ABI, REMITTANCE_ADDRESSES } from "@/lib/contracts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CreateScheduleSchema } from "@/lib/agent-schemas";

export interface AgentActionResponse {
  success: boolean;
  data?: any;
  error?: string;
  clarification?: string;
}

export class AgentService {
  private publicClient;
  private walletClient;
  private contractAddress: `0x${string}`;
  private genAI: GoogleGenerativeAI;
  private agentWalletAddress: string;

  constructor() {
    const envChainId = process.env.NEXT_PUBLIC_CHAIN_ID || "42220";
    const chainId = parseInt(envChainId, 10);
    const chain = chainId === 11142220 ? celoSepolia : celo;

    const rpcUrl =
      process.env.CELO_RPC_URL ||
      process.env.NEXT_PUBLIC_CELO_RPC_URL ||
      chain.rpcUrls.default.http[0];

    const privateKey = (process.env.AGENT_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY) as Hex;
    
    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    if (privateKey) {
      const account = privateKeyToAccount(privateKey);
      this.agentWalletAddress = account.address;
      this.walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl),
      });
    } else {
      this.agentWalletAddress = "0x0000000000000000000000000000000000000000";
      this.walletClient = null;
    }

    // Default to Sepolia/Mainnet address resolved from contracts configuration
    this.contractAddress = REMITTANCE_ADDRESSES[chainId as keyof typeof REMITTANCE_ADDRESSES] || REMITTANCE_ADDRESSES[42220];

    this.genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "");
  }

  getAgentAddress(): string {
    return this.agentWalletAddress;
  }

  /**
   * Process natural language prompts into structured actions using Gemini
   */
  async processNaturalLanguagePrompt(prompt: string, history?: any[]): Promise<AgentActionResponse> {
    let historyContext = "";
    if (history && history.length > 0) {
      historyContext = `\nUser's Active Remittances Context:\n` + history.map((item) => {
        const freqLabel = item.frequency === 0 ? "One-time" : item.frequency === 1 ? "Weekly" : "Monthly";
        const statusLabel = item.status === 0 ? "Active" : item.status === 1 ? "Paused" : item.status === 2 ? "Cancelled" : "Completed";
        return `- Schedule ID ${item.id}: to "${item.recipientName}" (${item.recipient}) | Amount: ${item.amount} USDm | Frequency: ${freqLabel} | Status: ${statusLabel} | Next Payment: ${item.nextPayment}`;
      }).join("\n");
    } else {
      historyContext = `\nUser has no active scheduled remittances.`;
    }

    const currentDateStr = new Date().toISOString().split("T")[0];

    const systemInstruction = `
You are the natural language intent parsing agent for Sendease, a mobile-first scheduled remittance MiniApp on Celo.
Your job is to analyze the user's prompt and extract structured parameters for creating a new remittance schedule, or reply to general conversation.

Capabilities:
1. "create_schedule": The user wants to schedule a recurring or one-time payment.
   Extract parameters in JSON:
   - recipientName (string, e.g. "Ana")
   - recipientAddress (string, MUST be a dummy/placeholder Celo address like "0x1234567890123456789012345678901234567890" if not provided in prompt. If provided, use it.)
   - recipientPhone (string, optional, e.g., "+628123456789")
   - amount (number, positive)
   - currency (fixed to "USDm")
   - frequency (string, "One-time" | "Weekly" | "Monthly")
   - startDate (string, YYYY-MM-DD format. Assume current date is ${currentDateStr}. If the user mentions a specific day e.g., "tiap tanggal 5", calculate the next YYYY-MM-DD date that falls on the 5th. If no date is specified, use today's date ${currentDateStr}.)
   - hasMonthlyLimit (boolean, defaults to false, set to true if user mentions monthly safety limit or max amount)
   - maxMonthlyAmount (number, optional, the safety limit amount)

Your response must be a valid JSON object only, with the following fields:
{
  "capability": "create_schedule",
  "params": { ... }
}

If the user request is missing critical information required to schedule a payment (like recipient name or amount), return:
{
  "error": "Short explanation of what is missing",
  "clarification": "Friendly request asking the user for the specific missing details"
}

If the user is asking a general question, greeting, chatting, or asking about their active schedules, reply using context with:
{
  "generalResponse": "A friendly, helpful response in Plain Indonesian or English answering their question or listing their schedules, referencing the provided active remittances context."
}

Respond ONLY with the JSON block. Do not include markdown formatting or backticks.

${historyContext}
`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      const parsed = JSON.parse(text);

      if (parsed.generalResponse) {
        return {
          success: true,
          data: {
            message: parsed.generalResponse,
          },
        };
      }

      if (parsed.error || parsed.clarification) {
        return {
          success: false,
          error: parsed.error || "Clarification required",
          clarification: parsed.clarification,
        };
      }

      const validated = CreateScheduleSchema.safeParse(parsed.params);
      if (!validated.success) {
        return {
          success: false,
          error: "Validation failed: " + validated.error.issues.map((e) => e.message).join(", "),
        };
      }

      return {
        success: true,
        data: {
          capability: "create_schedule",
          params: validated.data,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to parse natural language intent.",
      };
    }
  }
}
