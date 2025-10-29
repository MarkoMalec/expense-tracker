import { Currencies } from "@/lib/currencies";

export function DateToUTCDate(date: Date) {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds()
    )
  );
}

export function GetFormatterForCurrency(currency: string) {
  const locale = Currencies.find((c) => c.value === currency)?.locale;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  });
}

/**
 * Get the billing period based on the user's billing cycle day
 * @param cycleDay - Day of month when billing cycle starts (1-28)
 * @param referenceDate - Date to calculate period for (defaults to today)
 * @returns Object with from and to dates for the billing period
 */
export function getBillingPeriod(cycleDay: number, referenceDate: Date = new Date()) {
  const today = referenceDate.getDate();
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();

  if (today >= cycleDay) {
    // We're in the current billing cycle (e.g., today is Oct 25+, cycle is Oct 25 - Nov 24)
    return {
      from: new Date(currentYear, currentMonth, cycleDay, 0, 0, 0),
      to: new Date(currentYear, currentMonth + 1, cycleDay - 1, 23, 59, 59),
    };
  } else {
    // We're still in the previous billing cycle (e.g., today is Oct 20, cycle is Sep 25 - Oct 24)
    return {
      from: new Date(currentYear, currentMonth - 1, cycleDay, 0, 0, 0),
      to: new Date(currentYear, currentMonth, cycleDay - 1, 23, 59, 59),
    };
  }
}

/**
 * Get the previous billing period
 * @param cycleDay - Day of month when billing cycle starts (1-28)
 * @param referenceDate - Date to calculate period for (defaults to today)
 * @returns Object with from and to dates for the previous billing period
 */
export function getPreviousBillingPeriod(cycleDay: number, referenceDate: Date = new Date()) {
  const currentPeriod = getBillingPeriod(cycleDay, referenceDate);
  
  // Go back one month from the start of current period
  const previousStart = new Date(currentPeriod.from);
  previousStart.setMonth(previousStart.getMonth() - 1);
  
  return {
    from: previousStart,
    to: new Date(currentPeriod.from.getTime() - 1), // One millisecond before current period starts
  };
}

/**
 * Get a formatted label for a billing period
 * @param cycleDay - Day of month when billing cycle starts
 * @param referenceDate - Date to calculate period for
 * @returns Formatted string like "Oct 25 - Nov 24, 2025"
 */
export function getBillingPeriodLabel(cycleDay: number, referenceDate: Date = new Date()) {
  const { from, to } = getBillingPeriod(cycleDay, referenceDate);
  
  const fromStr = from.toLocaleDateString("default", {
    month: "short",
    day: "numeric",
  });
  
  const toStr = to.toLocaleDateString("default", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  
  return `${fromStr} - ${toStr}`;
}
