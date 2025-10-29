"use client";

import { GetBalanceStatsResponseType } from "@/app/api/stats/balance/route";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card } from "@/components/ui/card";
import { DateToUTCDate, GetFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import React, { useMemo } from "react";
import CountUp from "react-countup";

interface Props {
  from: Date;
  to: Date;
  userSettings: UserSettings;
}

function SavingsCard({ from, to, userSettings }: Props) {
  const statsQuery = useQuery<GetBalanceStatsResponseType>({
    queryKey: ["overview", "stats", from, to],
    queryFn: () =>
      fetch(
        `/api/stats/balance?from=${DateToUTCDate(from)}&to=${DateToUTCDate(to)}`
      ).then((res) => res.json()),
  });

  const formatter = useMemo(() => {
    return GetFormatterForCurrency(userSettings.currency);
  }, [userSettings.currency]);

  const income = statsQuery.data?.income || 0;
  const expense = statsQuery.data?.expense || 0;
  const savings = income - expense;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  const isPositive = savings >= 0;

  return (
    <SkeletonWrapper isLoading={statsQuery.isFetching}>
      <Card className="flex h-full w-full flex-col p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-12 w-12 items-center rounded-lg p-2 flex justify-center",
                isPositive
                  ? "bg-emerald-400/10 text-emerald-500"
                  : "bg-red-400/10 text-red-500"
              )}
            >
              <PiggyBank className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Savings</p>
              <div className="flex items-baseline gap-2">
                <CountUp
                  preserveValue
                  redraw={false}
                  end={savings}
                  decimals={2}
                  formattingFn={(value) => formatter.format(value)}
                  className="text-3xl font-bold"
                />
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col items-end gap-1",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}
          >
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-2xl font-bold">
                <CountUp
                  preserveValue
                  redraw={false}
                  end={Math.abs(savingsRate)}
                  decimals={1}
                  suffix="%"
                  className="text-2xl font-bold"
                />
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPositive ? "savings rate" : "deficit"}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Income</span>
            <span className="font-medium text-emerald-600">
              {formatter.format(income)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Expenses</span>
            <span className="font-medium text-red-600">
              {formatter.format(expense)}
            </span>
          </div>
        </div>

        {isPositive && savingsRate > 0 && (
          <div className="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-900">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {savingsRate >= 20
                ? "🎉 Excellent! You're saving over 20% of your income."
                : savingsRate >= 10
                ? "👍 Good job! Try to increase savings to 20% or more."
                : "💡 Consider reducing expenses to save at least 10% of your income."}
            </p>
          </div>
        )}

        {!isPositive && (
          <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 p-3 border border-red-200 dark:border-red-900">
            <p className="text-xs text-red-700 dark:text-red-300">
              ⚠️ You're spending more than earning. Review your expenses to get
              back on track.
            </p>
          </div>
        )}
      </Card>
    </SkeletonWrapper>
  );
}

export default SavingsCard;
