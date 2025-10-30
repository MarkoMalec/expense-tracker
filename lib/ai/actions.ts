/**
 * Type definitions for AI tools
 * These types align with the Zod schemas defined in tools.ts
 */

// Types for tool parameters (matching Zod schemas in tools.ts)
export type GetSpendingByCategoryParams = {
  categoryName: string;
  startDate?: string;
  endDate?: string;
};

export type GetTopSpendingCategoriesParams = {
  limit?: number;
  startDate?: string;
  endDate?: string;
};

export type GetSpendingSummaryParams = {
  startDate?: string;
  endDate?: string;
};

export type GetSpendingTrendParams = {
  months?: number;
};

export type GetSavingsRecommendationsParams = {
  monthsToAnalyze?: number;
};

// Return types for tool results
export type SpendingByCategoryResult = {
  categoryName: string;
  total: number;
  count: number;
  transactions: Array<{
    amount: number;
    category: string;
    description: string;
    date: Date;
  }>;
  period: {
    start: string;
    end: string;
  };
};

export type TopSpendingCategoriesResult = {
  topCategories: Array<{
    category: string;
    amount: number;
  }>;
  period: {
    start: string;
    end: string;
  };
};

export type SpendingSummaryResult = {
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  period: {
    start: string;
    end: string;
  };
};

export type SpendingTrendResult = {
  trends: Array<{
    month: string;
    totalSpending: number;
    transactionCount: number;
  }>;
};

export type SavingsRecommendationsResult = {
  topSpendingCategories: Array<{
    category: string;
    averagePerMonth: number;
    totalSpent: number;
  }>;
  analysisPeriod: {
    months: number;
    start: string;
    end: string;
  };
};
