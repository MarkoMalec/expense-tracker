"use client";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DateToUTCDate, GetFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import React, { useMemo } from "react";

interface Props {
  from: Date;
  to: Date;
  userSettings: UserSettings;
}

function BudgetHealthScore({ from, to, userSettings }: Props) {
  const statsQuery = useQuery({
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

  // Calculate health score (0-100)
  const calculateHealthScore = () => {
    if (income === 0) return 0;
    
    let score = 50; // Base score

    // Savings rate contribution (40 points max)
    if (savingsRate >= 30) score += 40;
    else if (savingsRate >= 20) score += 35;
    else if (savingsRate >= 10) score += 25;
    else if (savingsRate >= 5) score += 15;
    else if (savingsRate > 0) score += 10;
    else score -= 30; // Penalty for negative savings

    // Income vs expense ratio (10 points max)
    if (income > expense * 1.5) score += 10;
    else if (income > expense * 1.2) score += 5;
    else if (income < expense) score -= 20;

    return Math.max(0, Math.min(100, score));
  };

  const healthScore = calculateHealthScore();

  const getHealthStatus = () => {
    if (healthScore >= 80)
      return {
        label: "Excellent",
        color: "text-emerald-600",
        bgColor: "bg-emerald-500",
        icon: CheckCircle2,
        tips: [
          "Keep up the great work! Your finances are in excellent shape.",
          "Consider investing your extra savings for long-term growth.",
          "Review your investment portfolio quarterly.",
        ],
      };
    if (healthScore >= 60)
      return {
        label: "Good",
        color: "text-blue-600",
        bgColor: "bg-blue-500",
        icon: TrendingUp,
        tips: [
          "You're doing well! Try to increase your savings rate.",
          "Look for opportunities to reduce recurring expenses.",
          "Build an emergency fund if you haven't already.",
        ],
      };
    if (healthScore >= 40)
      return {
        label: "Fair",
        color: "text-yellow-600",
        bgColor: "bg-yellow-500",
        icon: AlertTriangle,
        tips: [
          "Review your expenses and identify areas to cut back.",
          "Set up a budget for each spending category.",
          "Try to save at least 10% of your income.",
        ],
      };
    return {
      label: "Needs Attention",
      color: "text-red-600",
      bgColor: "bg-red-500",
      icon: AlertCircle,
      tips: [
        "Urgent: You're spending more than you earn.",
        "Create a strict budget and track every expense.",
        "Consider ways to increase your income.",
        "Cut non-essential expenses immediately.",
      ],
    };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  return (
    <SkeletonWrapper isLoading={statsQuery.isFetching}>
      <Card>
        <CardHeader>
          <CardTitle>Financial Health Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full",
                  healthStatus.bgColor,
                  "bg-opacity-10"
                )}
              >
                <HealthIcon className={cn("h-6 w-6 md:h-8 md:w-8", healthStatus.color)} />
              </div>
              <div>
                <div className="flex items-baseline gap-1 md:gap-2">
                  <span className="text-2xl md:text-4xl font-bold">{healthScore}</span>
                  <span className="text-xs md:text-sm text-muted-foreground">/100</span>
                </div>
                <p className={cn("text-xs md:text-sm font-medium", healthStatus.color)}>
                  {healthStatus.label}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs md:text-sm text-muted-foreground">Savings Rate</p>
              <p
                className={cn(
                  "text-lg md:text-2xl font-bold",
                  savingsRate >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {savingsRate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Overall Health</span>
              <span className="font-medium">{healthScore}%</span>
            </div>
            <Progress value={healthScore} className="h-2 md:h-3" />
          </div>

          <div className="rounded-lg bg-muted/50 p-3 md:p-4 space-y-2">
            <p className="text-xs md:text-sm font-semibold flex items-center gap-2">
              <span>💡</span> Recommendations
            </p>
            <ul className="space-y-1.5 text-[10px] md:text-xs text-muted-foreground">
              {healthStatus.tips.map((tip, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
            <div className="rounded-lg border p-2 md:p-3">
              <p className="text-muted-foreground mb-1">Income</p>
              <p className="font-semibold text-emerald-600 text-xs md:text-sm">
                {formatter.format(income)}
              </p>
            </div>
            <div className="rounded-lg border p-2 md:p-3">
              <p className="text-muted-foreground mb-1">Expenses</p>
              <p className="font-semibold text-red-600 text-xs md:text-sm">
                {formatter.format(expense)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </SkeletonWrapper>
  );
}

export default BudgetHealthScore;
