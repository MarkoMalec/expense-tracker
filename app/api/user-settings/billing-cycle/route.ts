import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const BillingCycleSchema = z.object({
  billingCycleDay: z.number().min(1).max(28),
  preferredView: z.enum(["calendar", "billing"]),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const body = await request.json();
  const validation = BillingCycleSchema.safeParse(body);

  if (!validation.success) {
    return Response.json(
      { error: "Invalid request data" },
      { status: 400 }
    );
  }

  const { billingCycleDay, preferredView } = validation.data;

  try {
    const updatedSettings = await prisma.userSettings.update({
      where: {
        userId: user.id,
      },
      data: {
        billingCycleDay,
        preferredView,
      },
    });

    return Response.json(updatedSettings);
  } catch (error) {
    return Response.json(
      { error: "Failed to update billing cycle" },
      { status: 500 }
    );
  }
}
