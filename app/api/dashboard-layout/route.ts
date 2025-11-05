import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const layout = await prisma.dashboardLayout.findUnique({
      where: { userId: user.id },
    });

    // Return default layout if none exists
    if (!layout) {
      return NextResponse.json({
        cardOrder: [
          "stats-cards",
          "savings-card",
          "budget-health-score",
          "monthly-comparison-chart",
          "categories-stats",
          "top-categories-card",
          "spending-trend-chart",
        ],
        collapsed: [],
      });
    }

    return NextResponse.json({
      cardOrder: JSON.parse(layout.cardOrder),
      collapsed: JSON.parse(layout.collapsed),
    });
  } catch (error) {
    console.error("Error fetching dashboard layout:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard layout" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { cardOrder, collapsed } = body;

    if (!Array.isArray(cardOrder) || !Array.isArray(collapsed)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const layout = await prisma.dashboardLayout.upsert({
      where: { userId: user.id },
      update: {
        cardOrder: JSON.stringify(cardOrder),
        collapsed: JSON.stringify(collapsed),
      },
      create: {
        userId: user.id,
        cardOrder: JSON.stringify(cardOrder),
        collapsed: JSON.stringify(collapsed),
      },
    });

    return NextResponse.json({
      cardOrder: JSON.parse(layout.cardOrder),
      collapsed: JSON.parse(layout.collapsed),
    });
  } catch (error) {
    console.error("Error saving dashboard layout:", error);
    return NextResponse.json(
      { error: "Failed to save dashboard layout" },
      { status: 500 }
    );
  }
}
