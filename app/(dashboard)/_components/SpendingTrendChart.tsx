"use client";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetFormatterForCurrency } from "@/lib/helpers";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  userSettings: UserSettings;
}

function SpendingTrendChart({ userSettings }: Props) {
  const formatter = useMemo(() => {
    return GetFormatterForCurrency(userSettings.currency);
  }, [userSettings.currency]);

  // Get last 6 months of data
  const trendQuery = useQuery({
    queryKey: ["spending-trend"],
    queryFn: async () => {
      const monthsData = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const response = await fetch(
          `/api/stats/balance?from=${start.toISOString()}&to=${end.toISOString()}`
        );
        const data = await response.json();

        monthsData.push({
          month: date.toLocaleDateString("default", { month: "short" }),
          fullMonth: date.toLocaleDateString("default", {
            month: "long",
            year: "numeric",
          }),
          income: data.income || 0,
          expense: data.expense || 0,
          savings: (data.income || 0) - (data.expense || 0),
        });
      }
      return monthsData;
    },
  });

  const chartData = trendQuery.data || [];

  // Calculate average and trend
  const avgExpense =
    chartData.length > 0
      ? chartData.reduce((sum, item) => sum + item.expense, 0) / chartData.length
      : 0;
  const avgIncome =
    chartData.length > 0
      ? chartData.reduce((sum, item) => sum + item.income, 0) / chartData.length
      : 0;

  return (
    <SkeletonWrapper isLoading={trendQuery.isFetching}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>6-Month Spending Trend</span>
            <div className="flex gap-4 text-sm font-normal">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">
                  Avg: {formatter.format(avgIncome)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">
                  Avg: {formatter.format(avgExpense)}
                </span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip
                  content={(props) => (
                    <CustomTooltip formatter={formatter} {...props} />
                  )}
                  cursor={{ stroke: "#888", strokeWidth: 1, strokeDasharray: "5 5" }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#incomeGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#expenseGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </SkeletonWrapper>
  );
}

export default SpendingTrendChart;

function CustomTooltip({ active, payload, formatter }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 font-semibold">{data.fullMonth}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-muted-foreground">Income:</span>
          </div>
          <span className="text-sm font-medium text-emerald-600">
            {formatter.format(data.income)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-sm text-muted-foreground">Expenses:</span>
          </div>
          <span className="text-sm font-medium text-red-600">
            {formatter.format(data.expense)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t pt-1">
          <span className="text-sm text-muted-foreground">Net:</span>
          <span
            className={`text-sm font-semibold ${
              data.savings >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatter.format(data.savings)}
          </span>
        </div>
      </div>
    </div>
  );
}
