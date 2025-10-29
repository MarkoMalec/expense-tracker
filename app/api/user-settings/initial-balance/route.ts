import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const InitialBalanceSchema = z.object({
  initialBalance: z.number(),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const body = await request.json();
  const validation = InitialBalanceSchema.safeParse(body);

  if (!validation.success) {
    return Response.json(
      { error: "Invalid request data" },
      { status: 400 }
    );
  }

  const { initialBalance } = validation.data;

  try {
    const updatedSettings = await prisma.userSettings.update({
      where: {
        userId: user.id,
      },
      data: {
        initialBalance,
      },
    });

    return Response.json(updatedSettings);
  } catch (error) {
    return Response.json(
      { error: `Failed to update initial balance: ${error}` },
      { status: 500 }
    );
  }
}
