"use client";

import { GetBalanceStatsResponseType } from "@/app/api/stats/balance/route";
import SavingsGoalDialog from "@/app/(dashboard)/_components/SavingsGoalDialog";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DateToUTCDate, GetFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { PiggyBank, TrendingDown, TrendingUp, Target, AlertCircle } from "lucide-react";
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
  
  // Savings goal calculations
  const hasGoal = userSettings.savingsGoal > 0;
  // Budget = Income - Goal (how much you can spend to save the goal)
  const spendingBudget = hasGoal ? income - userSettings.savingsGoal : income;
  // How much you've already spent
  const alreadySpent = expense;
  // How much you can still spend
  const canStillSpend = spendingBudget - alreadySpent;
  // Progress = how much of your budget you've used
  const budgetUsedPercent = spendingBudget > 0 ? (alreadySpent / spendingBudget) * 100 : 0;
  const isOverBudget = alreadySpent > spendingBudget;
  // Projected savings if you stop spending now
  const projectedSavings = income - expense;

  return (
    <SkeletonWrapper isLoading={statsQuery.isFetching}>
      <Card className="flex h-full w-full flex-col p-6">
        <div className="flex items-center justify-between mb-4">
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
              <p className="text-sm text-muted-foreground">Current Savings</p>
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

          <SavingsGoalDialog userSettings={userSettings} />
        </div>

        {/* Spending Budget Progress */}
        {hasGoal && income > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Spending Budget</span>
              </div>
              <span className="font-semibold text-blue-600">
                {formatter.format(spendingBudget)}
              </span>
            </div>
            <Progress 
              value={Math.min(budgetUsedPercent, 100)} 
              className={cn("h-2", isOverBudget && "bg-red-200")}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {isOverBudget 
                  ? "⚠️ Over budget!" 
                  : `${budgetUsedPercent.toFixed(0)}% used`}
              </span>
              <span>
                {formatter.format(alreadySpent)} spent
              </span>
            </div>
          </div>
        )}

        {/* Spending Allowance */}
        {hasGoal && income > 0 && (
          <div className={cn(
            "mb-4 rounded-lg p-4 border",
            isOverBudget 
              ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
              : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
          )}>
            <div className="flex items-start gap-3">
              <AlertCircle className={cn(
                "h-5 w-5 mt-0.5 flex-shrink-0",
                isOverBudget ? "text-red-600" : "text-blue-600"
              )} />
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-semibold mb-1",
                  isOverBudget 
                    ? "text-red-900 dark:text-red-100" 
                    : "text-blue-900 dark:text-blue-100"
                )}>
                  {isOverBudget ? "Over Budget!" : "You Can Still Spend"}
                </p>
                <p className={cn(
                  "text-2xl font-bold mb-2",
                  isOverBudget 
                    ? "text-red-700 dark:text-red-300" 
                    : "text-blue-700 dark:text-blue-300"
                )}>
                  {formatter.format(Math.abs(canStillSpend))}
                </p>
                <p className={cn(
                  "text-xs",
                  isOverBudget 
                    ? "text-red-700 dark:text-red-300" 
                    : "text-blue-700 dark:text-blue-300"
                )}>
                  {isOverBudget 
                    ? `You've overspent by ${formatter.format(Math.abs(canStillSpend))}. Your projected savings: ${formatter.format(projectedSavings)} (Goal: ${formatter.format(userSettings.savingsGoal)})`
                    : `Income: ${formatter.format(income)} - Goal: ${formatter.format(userSettings.savingsGoal)} = Budget: ${formatter.format(spendingBudget)}. Already spent: ${formatter.format(alreadySpent)}.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-4">
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
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground font-medium">Savings Rate</span>
            <span className={cn(
              "font-semibold",
              isPositive ? "text-emerald-600" : "text-red-600"
            )}>
              {savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {!hasGoal && isPositive && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-900">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 Set a savings goal to see your spending budget and track your financial progress!
            </p>
          </div>
        )}

        {hasGoal && projectedSavings >= userSettings.savingsGoal && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-900">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              🎉 On track to save {formatter.format(userSettings.savingsGoal)}! Current projected savings: {formatter.format(projectedSavings)}
            </p>
          </div>
        )}

        {!isPositive && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 border border-red-200 dark:border-red-900">
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
