"use client";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp } from "lucide-react";
import React, { useMemo } from "react";
import CountUp from "react-countup";

interface Props {
  userSettings: UserSettings;
}

interface MonthlyStats {
  income: number;
  expense: number;
  savings: number;
}

function MonthlyComparisonChart({ userSettings }: Props) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const currentMonthQuery = useQuery({
    queryKey: ["comparison", "current", currentMonthStart, currentMonthEnd],
    queryFn: () =>
      fetch(
        `/api/stats/balance?from=${currentMonthStart.toISOString()}&to=${currentMonthEnd.toISOString()}`
      ).then((res) => res.json()),
  });

  const lastMonthQuery = useQuery({
    queryKey: ["comparison", "last", lastMonthStart, lastMonthEnd],
    queryFn: () =>
      fetch(
        `/api/stats/balance?from=${lastMonthStart.toISOString()}&to=${lastMonthEnd.toISOString()}`
      ).then((res) => res.json()),
  });

  const formatter = useMemo(() => {
    return GetFormatterForCurrency(userSettings.currency);
  }, [userSettings.currency]);

  const currentMonth: MonthlyStats = {
    income: currentMonthQuery.data?.income || 0,
    expense: currentMonthQuery.data?.expense || 0,
    savings: (currentMonthQuery.data?.income || 0) - (currentMonthQuery.data?.expense || 0),
  };

  const lastMonth: MonthlyStats = {
    income: lastMonthQuery.data?.income || 0,
    expense: lastMonthQuery.data?.expense || 0,
    savings: (lastMonthQuery.data?.income || 0) - (lastMonthQuery.data?.expense || 0),
  };

  const incomeChange = lastMonth.income > 0 
    ? ((currentMonth.income - lastMonth.income) / lastMonth.income) * 100 
    : 0;
  const expenseChange = lastMonth.expense > 0 
    ? ((currentMonth.expense - lastMonth.expense) / lastMonth.expense) * 100 
    : 0;
  const savingsChange = lastMonth.savings !== 0 
    ? ((currentMonth.savings - lastMonth.savings) / Math.abs(lastMonth.savings)) * 100 
    : 0;

  const isLoading = currentMonthQuery.isFetching || lastMonthQuery.isFetching;

  return (
    <SkeletonWrapper isLoading={isLoading}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Month-over-Month Comparison</span>
            <div className="text-sm font-normal text-muted-foreground">
              {now.toLocaleDateString("default", { month: "long", year: "numeric" })} vs{" "}
              {subMonths(now, 1).toLocaleDateString("default", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <ComparisonCard
              title="Income"
              current={currentMonth.income}
              previous={lastMonth.income}
              change={incomeChange}
              formatter={formatter}
              type="income"
            />
            <ComparisonCard
              title="Expenses"
              current={currentMonth.expense}
              previous={lastMonth.expense}
              change={expenseChange}
              formatter={formatter}
              type="expense"
            />
            <ComparisonCard
              title="Savings"
              current={currentMonth.savings}
              previous={lastMonth.savings}
              change={savingsChange}
              formatter={formatter}
              type="savings"
            />
          </div>
        </CardContent>
      </Card>
    </SkeletonWrapper>
  );
}

export default MonthlyComparisonChart;

function ComparisonCard({
  title,
  current,
  previous,
  change,
  formatter,
  type,
}: {
  title: string;
  current: number;
  previous: number;
  change: number;
  formatter: Intl.NumberFormat;
  type: "income" | "expense" | "savings";
}) {
  const isPositiveChange = change > 0;
  const isGoodChange =
    type === "income"
      ? isPositiveChange
      : type === "expense"
      ? !isPositiveChange
      : isPositiveChange;

  const color =
    type === "income"
      ? "text-emerald-600"
      : type === "expense"
      ? "text-red-600"
      : current >= 0
      ? "text-violet-600"
      : "text-red-600";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isGoodChange ? "text-emerald-600" : "text-red-600"
          )}
        >
          {change !== 0 && (
            <>
              {isPositiveChange ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              <span>{Math.abs(change).toFixed(1)}%</span>
            </>
          )}
          {change === 0 && <span className="text-muted-foreground">—</span>}
        </div>
      </div>

      <div>
        <CountUp
          preserveValue
          redraw={false}
          end={current}
          decimals={2}
          formattingFn={(value) => formatter.format(value)}
          className={cn("text-2xl font-bold", color)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Previous: {formatter.format(previous)}
        </p>
      </div>

      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            type === "income"
              ? "bg-emerald-500"
              : type === "expense"
              ? "bg-red-500"
              : "bg-violet-500"
          )}
          style={{
            width: previous > 0 ? `${Math.min((current / previous) * 100, 100)}%` : current > 0 ? "100%" : "0%",
          }}
        />
      </div>
    </div>
  );
}
