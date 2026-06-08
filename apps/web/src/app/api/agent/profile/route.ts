import { NextResponse } from "next/server";
import { AgentService } from "@/lib/agent-service";
import staticProfile from "../../../../../public/agent.json";

export async function GET() {
  try {
    const service = new AgentService();
    const address = process.env.AGENT_WALLET_ADDRESS || service.getAgentAddress();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://sendease.xyz";
    const imageUrl = process.env.NEXT_PUBLIC_AGENT_IMAGE_URL || staticProfile.image;
    const chainId = parseInt(process.env.AGENT_CHAIN_ID || "42220", 10);
    const envAgentId = process.env.AGENT_ID ? parseInt(process.env.AGENT_ID, 10) : undefined;

    const profile = {
      ...staticProfile,
      image: imageUrl,
      registrations: staticProfile.registrations.map((r) => ({
        ...r,
        agentId: envAgentId !== undefined && !isNaN(envAgentId) ? envAgentId : r.agentId,
      })),
      services: [
        {
          name: "http",
          endpoint: `${baseUrl}/api/agent/chat`,
          skills: staticProfile.services[0]?.skills || [],
        }
      ],
      endpoints: [
        {
          type: "http",
          url: `${baseUrl}/api/agent/profile`,
        },
        {
          type: "wallet",
          address: address,
          chainId: chainId,
        },
      ],
    };

    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load agent profile" },
      { status: 500 }
    );
  }
}
