"use client";

import { GetCategoriesStatsResponseType } from "@/app/api/stats/categories/route";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateToUTCDate, GetFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import React, { useMemo } from "react";

interface Props {
  from: Date;
  to: Date;
  userSettings: UserSettings;
}

function TopCategoriesCard({ from, to, userSettings }: Props) {
  const statsQuery = useQuery<GetCategoriesStatsResponseType>({
    queryKey: ["overview", "stats", "categories", from, to],
    queryFn: () =>
      fetch(
        `/api/stats/categories?from=${DateToUTCDate(from)}&to=${DateToUTCDate(
          to
        )}`
      ).then((res) => res.json()),
  });

  const formatter = useMemo(() => {
    return GetFormatterForCurrency(userSettings.currency);
  }, [userSettings.currency]);

  const incomeCategories = useMemo(() => {
    if (!statsQuery.data) return [];
    return statsQuery.data
      .filter((item) => item.type === "income")
      .sort((a, b) => (b._sum.amount || 0) - (a._sum.amount || 0))
      .slice(0, 3);
  }, [statsQuery.data]);

  const expenseCategories = useMemo(() => {
    if (!statsQuery.data) return [];
    return statsQuery.data
      .filter((item) => item.type === "expense")
      .sort((a, b) => (b._sum.amount || 0) - (a._sum.amount || 0))
      .slice(0, 3);
  }, [statsQuery.data]);

  const totalIncome = incomeCategories.reduce(
    (sum, item) => sum + (item._sum.amount || 0),
    0
  );
  const totalExpense = expenseCategories.reduce(
    (sum, item) => sum + (item._sum.amount || 0),
    0
  );

  return (
    <SkeletonWrapper isLoading={statsQuery.isFetching}>
      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Income Categories */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-semibold">Top Income Sources</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    {formatter.format(totalIncome)} total
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {incomeCategories.length > 0 ? (
                  incomeCategories.map((category, index) => {
                    const amount = category._sum.amount || 0;
                    const percentage = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
                    return (
                      <CategoryItem
                        key={category.category}
                        rank={index + 1}
                        icon={category.categoryIcon}
                        name={category.category}
                        amount={amount}
                        percentage={percentage}
                        formatter={formatter}
                        type="income"
                      />
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No income data for this period
                  </p>
                )}
              </div>
            </div>

            {/* Top Expense Categories */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-semibold">Top Expenses</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    {formatter.format(totalExpense)} total
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {expenseCategories.length > 0 ? (
                  expenseCategories.map((category, index) => {
                    const amount = category._sum.amount || 0;
                    const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                    return (
                      <CategoryItem
                        key={category.category}
                        rank={index + 1}
                        icon={category.categoryIcon}
                        name={category.category}
                        amount={amount}
                        percentage={percentage}
                        formatter={formatter}
                        type="expense"
                      />
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No expense data for this period
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </SkeletonWrapper>
  );
}

export default TopCategoriesCard;

function CategoryItem({
  rank,
  icon,
  name,
  amount,
  percentage,
  formatter,
  type,
}: {
  rank: number;
  icon: string;
  name: string;
  amount: number;
  percentage: number;
  formatter: Intl.NumberFormat;
  type: "income" | "expense";
}) {
  const rankColors = ["text-yellow-600", "text-gray-600", "text-orange-600"];
  const rankBgs = ["bg-yellow-100 dark:bg-yellow-950/30", "bg-gray-100 dark:bg-gray-800", "bg-orange-100 dark:bg-orange-950/30"];

  return (
    <div className="flex items-center gap-2 md:gap-3 rounded-lg border p-2 md:p-3 hover:bg-muted/50 transition-colors">
      <div
        className={cn(
          "flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full text-[10px] md:text-xs font-bold flex-shrink-0",
          rankBgs[rank - 1],
          rankColors[rank - 1]
        )}
      >
        {rank}
      </div>
      <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
        <span className="text-base md:text-lg flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-medium truncate">{name}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            {percentage.toFixed(1)}% of total
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className={cn(
            "text-xs md:text-sm font-semibold",
            type === "income" ? "text-emerald-600" : "text-red-600"
          )}
        >
          {formatter.format(amount)}
        </p>
      </div>
    </div>
  );
}
