import prisma from "@/lib/prisma";
import { OverviewQuerySchema } from "@/schema/overview";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const queryParams = OverviewQuerySchema.safeParse({ from, to });
  if (!queryParams.success) {
    throw new Error(queryParams.error.message);
  }

  const stats = await getCategoriesStats(
    user.id,
    queryParams.data.from,
    queryParams.data.to
  );
  return Response.json(stats);
}

export type GetCategoriesStatsResponseType = Awaited<
  ReturnType<typeof getCategoriesStats>
>;

async function getCategoriesStats(userId: string, from: Date, to: Date) {
  const stats = await prisma.transaction.groupBy({
    by: ["type", "categoryId"],
    where: {
      userId,
      date: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      amount: true,
    },
    orderBy: {
      _sum: {
        amount: "desc",
      },
    },
  });

  const categoryIds = Array.from(new Set(stats.map(s => s.categoryId)));
  const categories = await prisma.category.findMany({
    where: {
      id: {
        in: categoryIds,
      },
    },
  });

  const categoryMap = new Map(categories.map(c => [c.id, c]));

  return stats.map(stat => {
    const category = categoryMap.get(stat.categoryId);
    return {
      type: stat.type,
      category: category?.name || 'Unknown',
      categoryIcon: category?.icon || '❓',
      _sum: stat._sum,
    };
  });
}
