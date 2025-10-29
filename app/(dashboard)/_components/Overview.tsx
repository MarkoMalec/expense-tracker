"use client";

import CategoriesStats from "@/app/(dashboard)/_components/CategoriesStats";
import StatsCards from "@/app/(dashboard)/_components/StatsCards";
import SavingsCard from "@/app/(dashboard)/_components/SavingsCard";
import BudgetHealthScore from "@/app/(dashboard)/_components/BudgetHealthScore";
import TopCategoriesCard from "@/app/(dashboard)/_components/TopCategoriesCard";
import MonthlyComparisonChart from "@/app/(dashboard)/_components/MonthlyComparisonChart";
import SpendingTrendChart from "@/app/(dashboard)/_components/SpendingTrendChart";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MAX_DATE_RANGE_DAYS } from "@/lib/constants";
import { UserSettings } from "@prisma/client";
import { differenceInDays, startOfMonth, startOfYear } from "date-fns";
import React, { useState } from "react";
import { toast } from "sonner";

function Overview({ userSettings }: { userSettings: UserSettings }) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  return (
    <>
      <div className="container flex flex-wrap items-end justify-between gap-2 py-6">
        <h2 className="text-3xl font-bold">Overview</h2>
        <div className="flex items-center gap-3">
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            showCompare={false}
            onUpdate={(values) => {
              const { from, to } = values.range;
              // We update the date range only if both dates are set

              if (!from || !to) return;
              if (differenceInDays(to, from) > MAX_DATE_RANGE_DAYS) {
                toast.error(
                  `The selected date range is too big. Max allowed range is ${MAX_DATE_RANGE_DAYS} days!`
                );
                return;
              }

              setDateRange({ from, to });
            }}
          />
        </div>
      </div>
      <div className="container flex w-full flex-col gap-4">
        {/* Main Stats Row */}
        <StatsCards
          userSettings={userSettings}
          from={dateRange.from}
          to={dateRange.to}
        />

        {/* Savings and Health Score Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <SavingsCard
            userSettings={userSettings}
            from={dateRange.from}
            to={dateRange.to}
          />
          <BudgetHealthScore
            userSettings={userSettings}
            from={dateRange.from}
            to={dateRange.to}
          />
        </div>

        {/* Monthly Comparison */}
        <MonthlyComparisonChart userSettings={userSettings} />

        {/* Categories Breakdown */}
        <CategoriesStats
          userSettings={userSettings}
          from={dateRange.from}
          to={dateRange.to}
        />

        {/* Top Categories */}
        <TopCategoriesCard
          userSettings={userSettings}
          from={dateRange.from}
          to={dateRange.to}
        />

        {/* Spending Trend */}
        <SpendingTrendChart userSettings={userSettings} />
      </div>
    </>
  );
}

export default Overview;
