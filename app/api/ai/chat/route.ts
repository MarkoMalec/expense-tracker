import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { currentUser } from "@clerk/nextjs/server";
import { getAITools } from "@/lib/ai/tools";

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
      model: openai("gpt-4-turbo"),
      system: `You are a helpful financial assistant for an expense tracking application. 
      You help users understand their spending patterns, provide insights, and answer questions about their transactions.
      Be concise, friendly, and provide actionable advice.
      When analyzing expenses, always consider the date ranges and provide specific numbers.
      Format currency amounts properly based on the user's settings.
      When the user asks about specific categories (like "cigarettes"), search for similar category names.`,
      messages: convertToModelMessages(messages),
      tools,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI Chat Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
