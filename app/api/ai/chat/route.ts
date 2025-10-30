import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { currentUser } from "@clerk/nextjs/server";
import { getAITools } from "@/lib/ai/tools";
import { SYSTEM_PROMPT } from "@/lib/ai/config";

// Use Node.js runtime instead of Edge to support Prisma Client
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    // Get AI tools with user context
    const tools = await getAITools(user.id);

    const result = await streamText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      messages: convertToModelMessages(messages),
      tools,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI Chat Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
