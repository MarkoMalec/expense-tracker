"use client";

import CategoriesStats from "@/app/(dashboard)/_components/CategoriesStats";
import StatsCards from "@/app/(dashboard)/_components/StatsCards";
import SavingsCard from "@/app/(dashboard)/_components/SavingsCard";
import BudgetHealthScore from "@/app/(dashboard)/_components/BudgetHealthScore";
import TopCategoriesCard from "@/app/(dashboard)/_components/TopCategoriesCard";
import MonthlyComparisonChart from "@/app/(dashboard)/_components/MonthlyComparisonChart";
import SpendingTrendChart from "@/app/(dashboard)/_components/SpendingTrendChart";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { MAX_DATE_RANGE_DAYS } from "@/lib/constants";
import { getBillingPeriod, getBillingPeriodLabel } from "@/lib/helpers";
import { UserSettings } from "@prisma/client";
import { differenceInDays, endOfMonth, startOfMonth } from "date-fns";
import { Calendar, CalendarRange } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

function Overview({ userSettings }: { userSettings: UserSettings }) {
  const [viewMode, setViewMode] = useState<"calendar" | "billing">(
    userSettings.preferredView as "calendar" | "billing"
  );
  
  // Initialize date range based on preferred view
  const getInitialDateRange = () => {
    if (userSettings.preferredView === "billing") {
      return getBillingPeriod(userSettings.billingCycleDay);
    } else {
      return {
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      };
    }
  };

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(
    getInitialDateRange()
  );

  // Update date range when view mode changes
  const handleViewModeToggle = () => {
    const newMode = viewMode === "calendar" ? "billing" : "calendar";
    setViewMode(newMode);

    if (newMode === "billing") {
      const billingPeriod = getBillingPeriod(userSettings.billingCycleDay);
      setDateRange(billingPeriod);
    } else {
      setDateRange({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      });
    }
  };

  const periodLabel =
    viewMode === "billing"
      ? getBillingPeriodLabel(userSettings.billingCycleDay)
      : "Calendar Month";

  return (
    <>
      <div className="container flex flex-wrap items-end justify-between gap-2 py-6">
        <div>
          <h2 className="text-3xl font-bold">Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewModeToggle}
            className="gap-2"
          >
            {viewMode === "calendar" ? (
              <>
                <CalendarRange className="h-4 w-4" />
                Switch to Billing Cycle
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Switch to Calendar
              </>
            )}
          </Button>
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
        <MonthlyComparisonChart 
          userSettings={userSettings}
          viewMode={viewMode}
        />

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
