import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const SavingsGoalSchema = z.object({
  savingsGoal: z.number().min(0),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const body = await request.json();
  const validation = SavingsGoalSchema.safeParse(body);

  if (!validation.success) {
    return Response.json(
      { error: "Invalid request data" },
      { status: 400 }
    );
  }

  const { savingsGoal } = validation.data;

  try {
    const updatedSettings = await prisma.userSettings.update({
      where: {
        userId: user.id,
      },
      data: {
        savingsGoal,
      },
    });

    return Response.json(updatedSettings);
  } catch (error) {
    return Response.json(
      { error: "Failed to update savings goal" },
      { status: 500 }
    );
  }
}
