import { NextResponse } from "next/server";
import { AgentService } from "@/lib/agent-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.prompt || body.message;
    if (!prompt) {
      return NextResponse.json({ success: false, error: "Missing prompt or message" }, { status: 400 });
    }

    const service = new AgentService();
    const result = await service.processNaturalLanguagePrompt(prompt, body.history);
    
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to process chat" },
      { status: 500 }
    );
  }
}
