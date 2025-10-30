import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

/**
 * Get AI Tools with user context
 * This is the centralized place to define all AI tools/functions
 */
export function getAITools(userId: string) {
  return {
    // Tool: Get spending by category
    getSpendingByCategory: tool({
      description: "Get total spending for a specific category or categories. Useful for questions like 'How much did I spend on X?'",
      inputSchema: z.object({
        categoryName: z.string().describe("The category name to search for (case-insensitive, partial match)"),
        startDate: z.string().optional().describe("Start date in ISO format (YYYY-MM-DD). Defaults to start of current month"),
        endDate: z.string().optional().describe("End date in ISO format (YYYY-MM-DD). Defaults to end of current month"),
      }),
      execute: async (args) => {
        const start = args.startDate ? new Date(args.startDate) : startOfMonth(new Date());
        const end = args.endDate ? new Date(args.endDate) : endOfMonth(new Date());

        const transactions = await prisma.transaction.findMany({
          where: {
            userId,
            type: "expense",
            date: {
              gte: start,
              lte: end,
            },
            category: {
              contains: args.categoryName,
            },
          },
          select: {
            amount: true,
            category: true,
            description: true,
            date: true,
          },
        });

        const total = transactions.reduce((sum, t) => sum + t.amount, 0);
        const count = transactions.length;

        return {
          categoryName: args.categoryName,
          total,
          count,
          transactions: transactions.slice(0, 5), // Return top 5 transactions as examples
          period: { start: start.toISOString(), end: end.toISOString() },
        };
      },
    }),

    // Tool: Get top spending categories
    getTopSpendingCategories: tool({
      description: "Get the top spending categories for a given period. Useful for understanding where most money is going.",
      inputSchema: z.object({
        limit: z.number().default(5).describe("Number of top categories to return"),
        startDate: z.string().optional().describe("Start date in ISO format"),
        endDate: z.string().optional().describe("End date in ISO format"),
      }),
      execute: async ({ limit, startDate, endDate }) => {
        const start = startDate ? new Date(startDate) : startOfMonth(new Date());
        const end = endDate ? new Date(endDate) : endOfMonth(new Date());

        const transactions = await prisma.transaction.findMany({
          where: {
            userId,
            type: "expense",
            date: {
              gte: start,
              lte: end,
            },
          },
          select: {
            amount: true,
            category: true,
          },
        });

        // Group by category and sum
        const categoryTotals = transactions.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>);

        // Sort and limit
        const topCategories = Object.entries(categoryTotals)
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit)
          .map(([category, amount]) => ({ category, amount }));

        return {
          topCategories,
          period: { start: start.toISOString(), end: end.toISOString() },
        };
      },
    }),

    // Tool: Get spending summary
    getSpendingSummary: tool({
      description: "Get overall spending and income summary for a period. Shows total income, expenses, and savings.",
      inputSchema: z.object({
        startDate: z.string().optional().describe("Start date in ISO format"),
        endDate: z.string().optional().describe("End date in ISO format"),
      }),
      execute: async ({ startDate, endDate }) => {
        const start = startDate ? new Date(startDate) : startOfMonth(new Date());
        const end = endDate ? new Date(endDate) : endOfMonth(new Date());

        const transactions = await prisma.transaction.findMany({
          where: {
            userId,
            date: {
              gte: start,
              lte: end,
            },
          },
          select: {
            amount: true,
            type: true,
          },
        });

        const income = transactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        const expense = transactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        const savings = income - expense;
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;

        return {
          income,
          expense,
          savings,
          savingsRate: Math.round(savingsRate * 100) / 100,
          period: { start: start.toISOString(), end: end.toISOString() },
        };
      },
    }),

    // Tool: Get spending trends
    getSpendingTrend: tool({
      description: "Compare current month spending with previous months to identify trends. Useful for questions about spending changes over time.",
      inputSchema: z.object({
        months: z.number().default(3).describe("Number of previous months to compare"),
      }),
      execute: async ({ months }) => {
        const trends = [];

        for (let i = 0; i < months; i++) {
          const date = subMonths(new Date(), i);
          const start = startOfMonth(date);
          const end = endOfMonth(date);

          const transactions = await prisma.transaction.findMany({
            where: {
              userId,
              type: "expense",
              date: {
                gte: start,
                lte: end,
              },
            },
            select: {
              amount: true,
            },
          });

          const total = transactions.reduce((sum, t) => sum + t.amount, 0);

          trends.push({
            month: date.toISOString().slice(0, 7), // YYYY-MM format
            totalSpending: total,
            transactionCount: transactions.length,
          });
        }

        return { trends };
      },
    }),

    // Tool: Get savings recommendations
    getSavingsRecommendations: tool({
      description: "Analyze spending patterns and suggest categories where the user could cut expenses to improve savings.",
      inputSchema: z.object({
        monthsToAnalyze: z.number().default(3).describe("Number of months to analyze for patterns"),
      }),
      execute: async ({ monthsToAnalyze }) => {
        const start = startOfMonth(subMonths(new Date(), monthsToAnalyze));
        const end = endOfMonth(new Date());

        const transactions = await prisma.transaction.findMany({
          where: {
            userId,
            type: "expense",
            date: {
              gte: start,
              lte: end,
            },
          },
          select: {
            amount: true,
            category: true,
          },
        });

        // Group by category
        const categoryTotals = transactions.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>);

        // Calculate average per month
        const categoryAverages = Object.entries(categoryTotals).map(([category, total]) => ({
          category,
          averagePerMonth: total / monthsToAnalyze,
          totalSpent: total,
        }));

        // Sort by average spending
        categoryAverages.sort((a, b) => b.averagePerMonth - a.averagePerMonth);

        return {
          topSpendingCategories: categoryAverages.slice(0, 5),
          analysisPeriod: {
            months: monthsToAnalyze,
            start: start.toISOString(),
            end: end.toISOString(),
          },
        };
      },
    }),
  };
}
