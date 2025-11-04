import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Load user's chat history
export async function GET() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const messages = await prisma.aIChatMessage.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error loading chat history:", error);
    return NextResponse.json(
      { error: "Failed to load chat history" },
      { status: 500 }
    );
  }
}

// POST - Save chat messages
export async function POST(request: Request) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Delete existing messages and insert new ones
    await prisma.$transaction([
      prisma.aIChatMessage.deleteMany({
        where: {
          userId: user.id,
        },
      }),
      prisma.aIChatMessage.createMany({
        data: messages.map((msg: any) => ({
          userId: user.id,
          messageId: msg.messageId,
          role: msg.role,
          content: msg.content,
          toolName: msg.toolName || null,
          timestamp: new Date(msg.timestamp),
        })),
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving chat history:", error);
    return NextResponse.json(
      { error: "Failed to save chat history" },
      { status: 500 }
    );
  }
}

// DELETE - Clear user's chat history
export async function DELETE() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.aIChatMessage.deleteMany({
      where: {
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat history:", error);
    return NextResponse.json(
      { error: "Failed to delete chat history" },
      { status: 500 }
    );
  }
}
