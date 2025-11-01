import { tool } from "ai";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { CreateTransaction } from "@/app/(dashboard)/_actions/transactions";
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears, parseISO, isValid } from "date-fns";

function parseFlexibleDate(dateStr: string | undefined, defaultDate: Date): Date {
  if (!dateStr) return defaultDate;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : defaultDate;
  } catch {
    return defaultDate;
  }
}

export function getAITools(userId: string) {
  return {
    // Tool: Search and analyze transactions
    searchTransactions: tool({
      description: `Search and retrieve transactions based on flexible criteria. This is the PRIMARY tool for finding transactions. Use this tool to:
      - Find ALL transactions in a specific category (use categoryName parameter - e.g., "restorani", "restaurants", "food")
      - Find transactions by description keywords (use searchTerm parameter - e.g., "coffee", "uber", "amazon")
      - Search within specific categories or across all categories
      - Filter by transaction type (income/expense) or search both
      - Retrieve transactions for any date range or all time
      - Get detailed transaction information including amounts, dates, categories, and descriptions
      
      IMPORTANT: When user asks for "all transactions in category X" or "list expenses for category Y", use the categoryName parameter to search by category, NOT searchTerm.
      When user asks to find specific items or merchants (e.g., "find coffee purchases"), use searchTerm to search in descriptions.
      
      DATE HANDLING: 
      - When searching for "yesterday", "last week", etc., calculate the EXACT dates and pass them as startDate/endDate
      - Always use YYYY-MM-DD format for dates
      - Include the FULL day range (set end time to end of day, not start of day)
      - If no dates provided, searches ALL transactions ever recorded
      
      This is the most flexible tool for exploring user's financial data. When user asks general questions without specifics, use this to gather comprehensive information first.`,
      inputSchema: z.object({
        searchTerm: z.string().optional().describe("Keyword to search in transaction DESCRIPTIONS (e.g., 'starbucks', 'taxi', 'amazon'). Do NOT use this for category searches. Case-insensitive search."),
        categoryName: z.string().optional().describe("Category name to filter by (e.g., 'restaurants', 'transport', 'groceries'). Use this when user asks for transactions in a specific category. Case-insensitive, partial match supported."),
        type: z.enum(["income", "expense", "both"]).default("both").describe("Transaction type to filter by"),
        startDate: z.string().optional().describe("Start date in ISO format (YYYY-MM-DD). If not provided, searches from beginning of time. For 'yesterday', calculate exact date. For 'today', use today's date."),
        endDate: z.string().optional().describe("End date in ISO format (YYYY-MM-DD). If not provided, uses current date+time. IMPORTANT: This should be END of the day, not start of day."),
        limit: z.number().default(50).describe("Maximum number of transactions to return (default: 50, max: 200)"),
        sortBy: z.enum(["date", "amount"]).default("date").describe("Sort results by date or amount"),
        sortOrder: z.enum(["asc", "desc"]).default("desc").describe("Sort order: ascending or descending"),
      }),
      execute: async (args) => {
        // Enhanced date parsing with proper timezone handling
        let start: Date;
        let end: Date;
        
        if (args.startDate) {
          // Parse start date and set to beginning of day (00:00:00)
          start = parseFlexibleDate(args.startDate, new Date(0));
          start.setHours(0, 0, 0, 0);
        } else {
          // If no start date, search from beginning of time
          start = new Date(0);
        }
        
        if (args.endDate) {
          // Parse end date and set to END of day (23:59:59.999)
          end = parseFlexibleDate(args.endDate, new Date());
          end.setHours(23, 59, 59, 999);
        } else {
          // If no end date, use current moment
          end = new Date();
        }

        const limitCapped = Math.min(args.limit, 200);

        // Build where clause with better structure
        const whereClause: any = {
          userId,
          date: {
            gte: start,
            lte: end,
          },
        };

        if (args.type !== "both") {
          whereClause.type = args.type;
        }

        // Case-insensitive description search (manual toLowerCase for MySQL compatibility)
        if (args.searchTerm) {
          whereClause.description = {
            contains: args.searchTerm,
          };
        }

        // Enhanced category search with better matching
        let categoryFound = null;
        if (args.categoryName) {
          // Try to find category (MySQL is case-insensitive by default for LIKE operations)
          // First try exact match
          const categories = await prisma.category.findMany({
            where: {
              userId,
            },
            select: {
              id: true,
              name: true,
            },
          });

          // Find best match (case-insensitive)
          const searchLower = args.categoryName.toLowerCase();
          categoryFound = categories.find(c => c.name.toLowerCase() === searchLower) || 
                         categories.find(c => c.name.toLowerCase().includes(searchLower));

          if (categoryFound) {
            whereClause.categoryId = categoryFound.id;
          }
        }

        // Execute the query
        const transactions = await prisma.transaction.findMany({
          where: whereClause,
          select: {
            id: true,
            amount: true,
            description: true,
            date: true,
            type: true,
            createdAt: true,
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                description: true,
              },
            },
          },
          orderBy: args.sortBy === "date" 
            ? { date: args.sortOrder }
            : { amount: args.sortOrder },
          take: limitCapped,
        });

        // Calculate summary statistics
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        const incomeAmount = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
        const expenseAmount = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

        // Enhanced debugging information
        const debugInfo = {
          queryExecutedAt: new Date().toISOString(),
          dateRangeUsed: {
            start: start.toISOString(),
            end: end.toISOString(),
            startLocalTime: start.toLocaleString('en-US', { timeZone: 'UTC' }),
            endLocalTime: end.toLocaleString('en-US', { timeZone: 'UTC' }),
          },
          categorySearchResult: args.categoryName ? {
            searched: args.categoryName,
            found: categoryFound?.name || 'NOT_FOUND',
            categoryId: categoryFound?.id || null,
          } : null,
          filtersApplied: {
            hasSearchTerm: !!args.searchTerm,
            hasCategoryFilter: !!categoryFound,
            typeFilter: args.type,
          },
        };

        return {
          success: true,
          transactions: transactions.map(t => ({
            id: t.id,
            amount: t.amount,
            description: t.description,
            date: t.date.toISOString(),
            dateLocal: t.date.toLocaleString('en-US', { timeZone: 'UTC' }),
            type: t.type,
            category: {
              id: t.category.id,
              name: t.category.name,
              icon: t.category.icon,
              description: t.category.description,
            },
            createdAt: t.createdAt.toISOString(),
          })),
          summary: {
            totalCount: transactions.length,
            totalAmount: Math.round(totalAmount * 100) / 100,
            incomeAmount: Math.round(incomeAmount * 100) / 100,
            expenseAmount: Math.round(expenseAmount * 100) / 100,
            netAmount: Math.round((incomeAmount - expenseAmount) * 100) / 100,
          },
          searchCriteria: {
            searchTerm: args.searchTerm || null,
            categoryName: args.categoryName || null,
            categoryFound: categoryFound?.name || null,
            type: args.type,
            dateRange: { 
              start: start.toISOString(), 
              end: end.toISOString(),
              startDate: args.startDate || 'ALL_TIME',
              endDate: args.endDate || 'NOW',
            },
            limit: limitCapped,
            sortBy: args.sortBy,
            sortOrder: args.sortOrder,
          },
          debug: debugInfo,
        };
      },
    }),

    // Tool: Get comprehensive category analysis
    analyzeCategorySpending: tool({
      description: `Analyze spending or income for one or more categories with detailed breakdown. Use this to:
      - Get total spending/income for specific categories
      - Compare multiple categories side-by-side
      - View category descriptions and purposes
      - See transaction counts and averages
      - Identify spending patterns within categories
      If user asks about spending on something without specifying dates, analyze the current month by default but also provide historical context.`,
      inputSchema: z.object({
        categoryNames: z.array(z.string()).optional().describe("Optional array of category names to analyze. If not provided, analyzes all categories."),
        type: z.enum(["income", "expense", "both"]).default("expense").describe("Type of transactions to analyze"),
        startDate: z.string().optional().describe("Optional start date. Defaults to start of current month."),
        endDate: z.string().optional().describe("Optional end date. Defaults to current date."),
        includeTransactionExamples: z.boolean().default(true).describe("Whether to include sample transactions for each category"),
        groupByMonth: z.boolean().default(false).describe("Whether to break down spending by month for trend analysis"),
      }),
      execute: async (args) => {
        const start = args.startDate ? parseFlexibleDate(args.startDate, startOfMonth(new Date())) : startOfMonth(new Date());
        const end = args.endDate ? parseFlexibleDate(args.endDate, new Date()) : new Date();

        const whereClause: any = {
          userId,
          date: {
            gte: start,
            lte: end,
          },
        };

        if (args.type !== "both") {
          whereClause.type = args.type;
        }

        if (args.categoryNames && args.categoryNames.length > 0) {
          whereClause.OR = args.categoryNames.map(name => ({
            category: {
              contains: name,
            },
          }));
        }

        const transactions = await prisma.transaction.findMany({
          where: whereClause,
          select: {
            amount: true,
            category: {
              select: {
                name: true,
                icon: true,
                type: true,
                description: true,
              },
            },
            description: true,
            date: true,
            type: true,
          },
        });

        // Group by category
        const categoryData: Record<string, any> = {};
        transactions.forEach(t => {
          const categoryName = t.category.name;
          if (!categoryData[categoryName]) {
            categoryData[categoryName] = {
              category: categoryName,
              icon: t.category.icon,
              type: t.type,
              totalAmount: 0,
              transactionCount: 0,
              transactions: [],
              monthlyBreakdown: {} as Record<string, number>,
            };
          }
          categoryData[categoryName].totalAmount += t.amount;
          categoryData[categoryName].transactionCount += 1;
          categoryData[categoryName].transactions.push(t);
          
          if (args.groupByMonth) {
            const monthKey = t.date.toISOString().slice(0, 7);
            categoryData[categoryName].monthlyBreakdown[monthKey] = 
              (categoryData[categoryName].monthlyBreakdown[monthKey] || 0) + t.amount;
          }
        });

        // Get category descriptions
        const categoryNames = Object.keys(categoryData);
        const categories = await prisma.category.findMany({
          where: {
            userId,
            name: {
              in: categoryNames,
            },
          },
          select: {
            name: true,
            description: true,
            icon: true,
            type: true,
          },
        });

        const categoryDescriptions = categories.reduce((acc, cat) => {
          acc[cat.name] = {
            description: cat.description || "",
            icon: cat.icon,
          };
          return acc;
        }, {} as Record<string, any>);

        const results = Object.values(categoryData).map((data: any) => ({
          category: data.category,
          type: data.type,
          description: categoryDescriptions[data.category]?.description || "",
          icon: categoryDescriptions[data.category]?.icon || "",
          totalAmount: data.totalAmount,
          transactionCount: data.transactionCount,
          averageAmount: data.totalAmount / data.transactionCount,
          monthlyBreakdown: args.groupByMonth ? data.monthlyBreakdown : undefined,
          exampleTransactions: args.includeTransactionExamples 
            ? data.transactions.slice(0, 5).map((t: any) => ({
                amount: t.amount,
                description: t.description,
                date: t.date.toISOString(),
              }))
            : undefined,
        }));

        results.sort((a, b) => b.totalAmount - a.totalAmount);

        return {
          categories: results,
          summary: {
            totalCategories: results.length,
            totalAmount: results.reduce((sum, r) => sum + r.totalAmount, 0),
            totalTransactions: results.reduce((sum, r) => sum + r.transactionCount, 0),
          },
          period: { start: start.toISOString(), end: end.toISOString() },
        };
      },
    }),

    // Tool: Get financial overview and summary
    getFinancialOverview: tool({
      description: `Get comprehensive financial overview including income, expenses, savings, and trends. Use this when:
      - User asks general questions like "how am I doing?", "what's my financial situation?"
      - User wants to see their overall financial health
      - User asks about savings, spending totals, or income without specific details
      If no date range is specified, provide current month data and compare with previous months for context.`,
      inputSchema: z.object({
        startDate: z.string().optional().describe("Start date in ISO format. Defaults to start of current month."),
        endDate: z.string().optional().describe("End date in ISO format. Defaults to current date."),
        includeTrends: z.boolean().default(true).describe("Include comparison with previous periods"),
        includeTopCategories: z.boolean().default(true).describe("Include top spending categories"),
        topCategoriesLimit: z.number().default(5).describe("Number of top categories to include"),
        compareWithPreviousPeriod: z.boolean().default(true).describe("Compare with equivalent previous period"),
      }),
      execute: async (args) => {
        const start = args.startDate ? parseFlexibleDate(args.startDate, startOfMonth(new Date())) : startOfMonth(new Date());
        const end = args.endDate ? parseFlexibleDate(args.endDate, new Date()) : new Date();

        // Get current period transactions
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
            category: {
              select: {
                name: true,
                icon: true,
              },
            },
            description: true,
            date: true,
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

        // Get user settings for context
        const userSettings = await prisma.userSettings.findUnique({
          where: { userId },
          select: {
            currency: true,
            savingsGoal: true,
            initialBalance: true,
          },
        });

        // Top spending categories
        let topCategories: any[] = [];
        if (args.includeTopCategories) {
          const categoryTotals = transactions
            .filter(t => t.type === "expense")
            .reduce((acc, t) => {
              acc[t.category.name] = (acc[t.category.name] || 0) + t.amount;
              return acc;
            }, {} as Record<string, number>);

          const categoryNames = Object.keys(categoryTotals);
          const categories = await prisma.category.findMany({
            where: {
              userId,
              type: "expense",
              name: { in: categoryNames },
            },
            select: {
              name: true,
              description: true,
              icon: true,
            },
          });

          const categoryMap = categories.reduce((acc, cat) => {
            acc[cat.name] = { description: cat.description, icon: cat.icon };
            return acc;
          }, {} as Record<string, any>);

          topCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, args.topCategoriesLimit)
            .map(([category, amount]) => ({
              category,
              amount,
              percentage: (amount / expense) * 100,
              description: categoryMap[category]?.description || "",
              icon: categoryMap[category]?.icon || "",
            }));
        }

        // Previous period comparison
        let previousPeriod: any = null;
        if (args.compareWithPreviousPeriod) {
          const periodLength = end.getTime() - start.getTime();
          const prevStart = new Date(start.getTime() - periodLength);
          const prevEnd = new Date(start.getTime() - 1);

          const prevTransactions = await prisma.transaction.findMany({
            where: {
              userId,
              date: {
                gte: prevStart,
                lte: prevEnd,
              },
            },
            select: {
              amount: true,
              type: true,
            },
          });

          const prevIncome = prevTransactions
            .filter(t => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);

          const prevExpense = prevTransactions
            .filter(t => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

          previousPeriod = {
            income: prevIncome,
            expense: prevExpense,
            savings: prevIncome - prevExpense,
            period: { start: prevStart.toISOString(), end: prevEnd.toISOString() },
            changes: {
              incomeChange: income - prevIncome,
              incomeChangePercent: prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0,
              expenseChange: expense - prevExpense,
              expenseChangePercent: prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : 0,
              savingsChange: savings - (prevIncome - prevExpense),
            },
          };
        }

        return {
          currentPeriod: {
            income,
            expense,
            savings,
            savingsRate: Math.round(savingsRate * 100) / 100,
            transactionCount: transactions.length,
            period: { start: start.toISOString(), end: end.toISOString() },
          },
          userSettings: {
            currency: userSettings?.currency || "USD",
            savingsGoal: userSettings?.savingsGoal || 0,
            savingsGoalProgress: userSettings?.savingsGoal ? (savings / userSettings.savingsGoal) * 100 : 0,
          },
          topCategories: args.includeTopCategories ? topCategories : undefined,
          previousPeriod: args.compareWithPreviousPeriod ? previousPeriod : undefined,
        };
      },
    }),

    // Tool: Analyze spending trends over time
    analyzeSpendingTrends: tool({
      description: `Analyze spending and income trends over multiple time periods. Use this to:
      - Identify spending patterns and changes over time
      - Compare multiple months or years
      - Detect unusual spending spikes or drops
      - Track income stability and growth
      - Provide month-by-month or year-by-year breakdowns
      Great for questions like "how has my spending changed?", "show me my spending over time", "am I spending more than before?"`,
      inputSchema: z.object({
        periodType: z.enum(["month", "year"]).default("month").describe("Whether to analyze by month or year"),
        periodsCount: z.number().default(6).describe("Number of periods to analyze (e.g., 6 months or 3 years)"),
        includeCurrentPeriod: z.boolean().default(true).describe("Whether to include the current incomplete period"),
        breakdownByCategory: z.boolean().default(false).describe("Whether to break down each period by category"),
        topCategoriesPerPeriod: z.number().default(3).describe("If breaking down by category, how many top categories to show per period"),
      }),
      execute: async (args) => {
        const trends = [];
        const now = new Date();

        for (let i = 0; i < args.periodsCount; i++) {
          let start: Date, end: Date, label: string;

          if (args.periodType === "month") {
            const date = subMonths(now, i);
            start = startOfMonth(date);
            end = i === 0 && args.includeCurrentPeriod ? now : endOfMonth(date);
            label = date.toISOString().slice(0, 7); // YYYY-MM
          } else {
            const date = subYears(now, i);
            start = startOfYear(date);
            end = i === 0 && args.includeCurrentPeriod ? now : endOfYear(date);
            label = date.getFullYear().toString();
          }

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
              category: {
                select: {
                  name: true,
                  icon: true,
                },
              },
            },
          });

          const income = transactions
            .filter(t => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);

          const expense = transactions
            .filter(t => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

          let categoryBreakdown: any[] | undefined;
          if (args.breakdownByCategory) {
            const categoryTotals = transactions
              .filter(t => t.type === "expense")
              .reduce((acc, t) => {
                acc[t.category.name] = (acc[t.category.name] || 0) + t.amount;
                return acc;
              }, {} as Record<string, number>);

            categoryBreakdown = Object.entries(categoryTotals)
              .sort(([, a], [, b]) => b - a)
              .slice(0, args.topCategoriesPerPeriod)
              .map(([category, amount]) => ({
                category,
                amount,
                percentage: expense > 0 ? (amount / expense) * 100 : 0,
              }));
          }

          trends.push({
            period: label,
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            income,
            expense,
            savings: income - expense,
            savingsRate: income > 0 ? (income - expense) / income * 100 : 0,
            transactionCount: transactions.length,
            categoryBreakdown,
          });
        }

        // Reverse to show oldest first
        trends.reverse();

        // Calculate overall trends
        const avgIncome = trends.reduce((sum, t) => sum + t.income, 0) / trends.length;
        const avgExpense = trends.reduce((sum, t) => sum + t.expense, 0) / trends.length;
        const avgSavings = trends.reduce((sum, t) => sum + t.savings, 0) / trends.length;

        const recentTrend = trends.length >= 2 ? {
          incomeDirection: trends[trends.length - 1].income > trends[trends.length - 2].income ? "increasing" : "decreasing",
          expenseDirection: trends[trends.length - 1].expense > trends[trends.length - 2].expense ? "increasing" : "decreasing",
          savingsDirection: trends[trends.length - 1].savings > trends[trends.length - 2].savings ? "increasing" : "decreasing",
        } : null;

        return {
          trends,
          summary: {
            periodType: args.periodType,
            periodsAnalyzed: trends.length,
            averageIncome: avgIncome,
            averageExpense: avgExpense,
            averageSavings: avgSavings,
            recentTrend,
          },
        };
      },
    }),

    // Tool: Get savings insights and recommendations
    getSavingsInsights: tool({
      description: `Analyze spending patterns and provide personalized savings recommendations. Use this when:
      - User asks "how can I save more?", "where should I cut spending?"
      - User wants advice on improving their financial situation
      - User asks about spending optimization
      This tool provides actionable insights based on actual spending data and category descriptions.`,
      inputSchema: z.object({
        analysisMonths: z.number().default(3).describe("Number of months to analyze for patterns"),
        includeAllCategories: z.boolean().default(true).describe("Include all categories or just top spenders"),
        minSpendingThreshold: z.number().default(0).describe("Minimum spending amount to consider a category (useful to filter out small expenses)"),
      }),
      execute: async (args) => {
        const start = startOfMonth(subMonths(new Date(), args.analysisMonths));
        const end = new Date();

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
            category: {
              select: {
                name: true,
                icon: true,
                description: true,
              },
            },
            description: true,
            date: true,
          },
        });

        // Calculate category totals and patterns
        const categoryData: Record<string, any> = {};
        transactions.forEach(t => {
          const categoryName = t.category.name;
          if (!categoryData[categoryName]) {
            categoryData[categoryName] = {
              total: 0,
              count: 0,
              icon: t.category.icon,
              description: t.category.description,
              transactions: [],
              monthlySpending: {} as Record<string, number>,
            };
          }
          categoryData[categoryName].total += t.amount;
          categoryData[categoryName].count += 1;
          categoryData[categoryName].transactions.push(t);
          
          const monthKey = t.date.toISOString().slice(0, 7);
          categoryData[categoryName].monthlySpending[monthKey] = 
            (categoryData[categoryName].monthlySpending[monthKey] || 0) + t.amount;
        });

        // Get category descriptions for context
        const categoryNames = Object.keys(categoryData);
        const categories = await prisma.category.findMany({
          where: {
            userId,
            type: "expense",
            name: { in: categoryNames },
          },
          select: {
            name: true,
            description: true,
            icon: true,
          },
        });

        const categoryDescriptions = categories.reduce((acc, cat) => {
          acc[cat.name] = {
            description: cat.description || "",
            icon: cat.icon,
          };
          return acc;
        }, {} as Record<string, any>);

        // Analyze each category
        const insights = Object.entries(categoryData)
          .filter(([_, data]: [string, any]) => data.total >= args.minSpendingThreshold)
          .map(([category, data]: [string, any]) => {
            const avgPerMonth = data.total / args.analysisMonths;
            const monthlyValues = Object.values(data.monthlySpending) as number[];
            const maxMonth = Math.max(...monthlyValues);
            const minMonth = Math.min(...monthlyValues);
            const volatility = monthlyValues.length > 1 ? (maxMonth - minMonth) / avgPerMonth : 0;
            
            return {
              category,
              description: categoryDescriptions[category]?.description || "",
              icon: categoryDescriptions[category]?.icon || "",
              totalSpent: data.total,
              averagePerMonth: avgPerMonth,
              transactionCount: data.count,
              averagePerTransaction: data.total / data.count,
              volatility: Math.round(volatility * 100) / 100,
              monthlySpending: data.monthlySpending,
              highestMonth: maxMonth,
              lowestMonth: minMonth,
            };
          })
          .sort((a, b) => b.totalSpent - a.totalSpent);

        // Get user settings for savings goal context
        const userSettings = await prisma.userSettings.findUnique({
          where: { userId },
          select: {
            savingsGoal: true,
            currency: true,
          },
        });

        // Calculate total spending and potential savings areas
        const totalSpending = insights.reduce((sum, i) => sum + i.totalSpent, 0);
        const avgMonthlySpending = totalSpending / args.analysisMonths;

        // Identify high-volatility categories (potential optimization targets)
        const highVolatilityCategories = insights
          .filter(i => i.volatility > 0.3)
          .slice(0, 5);

        // Identify consistently high spending categories
        const topConsistentSpenders = insights
          .filter(i => i.volatility < 0.3 && i.totalSpent > totalSpending * 0.05)
          .slice(0, 5);

        return {
          analysisOverview: {
            totalSpending,
            averageMonthlySpending: avgMonthlySpending,
            categoryCount: insights.length,
            transactionCount: transactions.length,
            analysisPeriod: {
              months: args.analysisMonths,
              start: start.toISOString(),
              end: end.toISOString(),
            },
            savingsGoal: userSettings?.savingsGoal || 0,
            currency: userSettings?.currency || "USD",
          },
          allCategories: args.includeAllCategories ? insights : insights.slice(0, 10),
          highVolatilityCategories,
          topConsistentSpenders,
          insights: {
            totalCategories: insights.length,
            highestSpendingCategory: insights[0],
            volatileCategoriesCount: highVolatilityCategories.length,
          },
        };
      },
    }),

    // Tool: Get all available categories
    getAvailableCategories: tool({
      description: `Retrieve all income and expense categories that the user has created. Use this to:
      - Help user understand what categories they can query about
      - Show what expenses/income types they're tracking
      - Provide context for other tool calls
      - When user asks "what categories do I have?" or "what am I tracking?"`,
      inputSchema: z.object({
        type: z.enum(["income", "expense", "both"]).default("both").describe("Filter categories by type"),
        includeUsageStats: z.boolean().default(true).describe("Include transaction count and total amount for each category"),
      }),
      execute: async (args) => {
        const whereClause: any = { userId };
        if (args.type !== "both") {
          whereClause.type = args.type;
        }

        const categories = await prisma.category.findMany({
          where: whereClause,
          select: {
            name: true,
            icon: true,
            type: true,
            description: true,
            createdAt: true,
          },
          orderBy: {
            name: 'asc',
          },
        });

        let categoriesWithStats = categories;

        if (args.includeUsageStats) {
          const categoryStats = await Promise.all(
            categories.map(async (cat) => {
              const transactions = await prisma.transaction.findMany({
                where: {
                  userId,
                  category: {
                    name: cat.name,
                  },
                  type: cat.type,
                },
                select: {
                  amount: true,
                  id: true,
                },
              });

              const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
              
              return {
                ...cat,
                transactionCount: transactions.length,
                totalAmount,
                averageAmount: transactions.length > 0 ? totalAmount / transactions.length : 0,
              };
            })
          );

          categoriesWithStats = categoryStats;
        }

        return {
          categories: categoriesWithStats,
          summary: {
            totalCategories: categories.length,
            incomeCategories: categories.filter(c => c.type === "income").length,
            expenseCategories: categories.filter(c => c.type === "expense").length,
          },
        };
      },
    }),

    // Tool: Compare time periods
    compareTimePeriods: tool({
      description: `Compare financial metrics between two specific time periods. Use this when:
      - User wants to compare "this month vs last month"
      - User asks "how does this year compare to last year?"
      - User wants to see specific period-to-period changes
      Provides detailed comparison with percentage changes and category-level insights.`,
      inputSchema: z.object({
        period1Start: z.string().describe("Start date of first period (ISO format YYYY-MM-DD)"),
        period1End: z.string().describe("End date of first period (ISO format YYYY-MM-DD)"),
        period2Start: z.string().describe("Start date of second period (ISO format YYYY-MM-DD)"),
        period2End: z.string().describe("End date of second period (ISO format YYYY-MM-DD)"),
        includeCategoryComparison: z.boolean().default(true).describe("Compare spending by category between periods"),
        topCategoriesToCompare: z.number().default(10).describe("Number of top categories to compare"),
      }),
      execute: async (args) => {
        const p1Start = parseFlexibleDate(args.period1Start, new Date());
        const p1End = parseFlexibleDate(args.period1End, new Date());
        const p2Start = parseFlexibleDate(args.period2Start, new Date());
        const p2End = parseFlexibleDate(args.period2End, new Date());

        // Get transactions for both periods
        const [period1Transactions, period2Transactions] = await Promise.all([
          prisma.transaction.findMany({
            where: {
              userId,
              date: { gte: p1Start, lte: p1End },
            },
            select: { 
              amount: true, 
              type: true, 
              category: {
                select: {
                  name: true,
                  icon: true,
                },
              },
            },
          }),
          prisma.transaction.findMany({
            where: {
              userId,
              date: { gte: p2Start, lte: p2End },
            },
            select: { 
              amount: true, 
              type: true, 
              category: {
                select: {
                  name: true,
                  icon: true,
                },
              },
            },
          }),
        ]);

        // Calculate totals for period 1
        const p1Income = period1Transactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);
        const p1Expense = period1Transactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        // Calculate totals for period 2
        const p2Income = period2Transactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);
        const p2Expense = period2Transactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        // Category comparison
        let categoryComparison: any[] = [];
        if (args.includeCategoryComparison) {
          const p1Categories = period1Transactions
            .filter(t => t.type === "expense")
            .reduce((acc, t) => {
              acc[t.category.name] = (acc[t.category.name] || 0) + t.amount;
              return acc;
            }, {} as Record<string, number>);

          const p2Categories = period2Transactions
            .filter(t => t.type === "expense")
            .reduce((acc, t) => {
              acc[t.category.name] = (acc[t.category.name] || 0) + t.amount;
              return acc;
            }, {} as Record<string, number>);

          const allCategories = new Set([...Object.keys(p1Categories), ...Object.keys(p2Categories)]);
          
          categoryComparison = Array.from(allCategories)
            .map(category => {
              const p1Amount = p1Categories[category] || 0;
              const p2Amount = p2Categories[category] || 0;
              const change = p2Amount - p1Amount;
              const changePercent = p1Amount > 0 ? (change / p1Amount) * 100 : (p2Amount > 0 ? 100 : 0);

              return {
                category,
                period1Amount: p1Amount,
                period2Amount: p2Amount,
                change,
                changePercent: Math.round(changePercent * 100) / 100,
              };
            })
            .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
            .slice(0, args.topCategoriesToCompare);
        }

        const incomeChange = p2Income - p1Income;
        const expenseChange = p2Expense - p1Expense;
        const savingsChange = (p2Income - p2Expense) - (p1Income - p1Expense);

        return {
          period1: {
            start: p1Start.toISOString(),
            end: p1End.toISOString(),
            income: p1Income,
            expense: p1Expense,
            savings: p1Income - p1Expense,
            transactionCount: period1Transactions.length,
          },
          period2: {
            start: p2Start.toISOString(),
            end: p2End.toISOString(),
            income: p2Income,
            expense: p2Expense,
            savings: p2Income - p2Expense,
            transactionCount: period2Transactions.length,
          },
          changes: {
            income: {
              absolute: incomeChange,
              percent: p1Income > 0 ? (incomeChange / p1Income) * 100 : 0,
            },
            expense: {
              absolute: expenseChange,
              percent: p1Expense > 0 ? (expenseChange / p1Expense) * 100 : 0,
            },
            savings: {
              absolute: savingsChange,
              percent: (p1Income - p1Expense) > 0 ? (savingsChange / (p1Income - p1Expense)) * 100 : 0,
            },
          },
          categoryComparison: args.includeCategoryComparison ? categoryComparison : undefined,
        };
      },
    }),

    createNewExpenseTransaction: tool({
        description: `Create a new expense transaction for the user. Use this when:
        - User wants to log a new expense
        - User provides details like amount, category, date, and description
        
        CRITICAL DATE HANDLING:
        - When user says "prekjučer" (day before yesterday), calculate the exact date: ${new Date(Date.now() - 2*24*60*60*1000).toISOString().split("T")[0]}
        - When user says "jučer" (yesterday), use: ${new Date(Date.now() - 24*60*60*1000).toISOString().split("T")[0]}
        - When user says "danas" (today), use: ${new Date().toISOString().split("T")[0]}
        - ALWAYS pass dates in YYYY-MM-DD format
        - The tool will set the time to NOON (12:00:00) to avoid timezone issues
        
        Ensure the transaction is saved correctly in the database.`,
        inputSchema: z.object({
          amount: z.number().describe("Amount of the expense"),
          category: z.string().describe("Category name of the expense (in Croatian, e.g., 'Auto', 'Restorani', 'Hrana')"),
          date: z.string().optional().describe("Date of the expense in YYYY-MM-DD format. Defaults to today. IMPORTANT: Calculate exact dates for relative terms like 'prekjučer', 'jučer', etc."),
          description: z.string().optional().describe("Optional description for the expense"),
        }),
        execute: async (args) => {
          // Parse date and set to NOON to avoid timezone shifting issues
          let expenseDate: Date;
          if (args.date) {
            expenseDate = parseFlexibleDate(args.date, new Date());
            // Set to noon (12:00:00) to avoid timezone boundary issues
            expenseDate.setHours(12, 0, 0, 0);
          } else {
            expenseDate = new Date();
            expenseDate.setHours(12, 0, 0, 0);
          }

          const form = {
            amount: args.amount,
            category: args.category,
            date: expenseDate,
            description: args.description || "",
            type: "expense" as const,
            userId,
          };

          try {
            const newTransaction = await CreateTransaction(form);

            return {
              success: true,
              transaction: {
                amount: args.amount,
                category: args.category,
                date: expenseDate.toISOString(),
                dateFormatted: expenseDate.toLocaleDateString('hr-HR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }),
                description: args.description || "",
              },
              message: `Transakcija uspješno kreirana za ${expenseDate.toLocaleDateString('hr-HR', { day: 'numeric', month: 'long' })}`,
              debug: {
                dateReceived: args.date || 'not provided',
                dateParsed: expenseDate.toISOString(),
                dateLocal: expenseDate.toLocaleString('hr-HR'),
                timeSet: '12:00:00 (noon to avoid timezone issues)',
              },
            };
          } catch (error: any) {
            return {
              success: false,
              error: error.message || "Failed to create transaction",
              debug: {
                dateReceived: args.date || 'not provided',
                dateParsed: expenseDate.toISOString(),
                category: args.category,
                amount: args.amount,
              },
            };
          }
        }
    }),

    modifyTransaction: tool({
      description: `Modify an existing transaction's details such as amount, category, date, or description.`,
      inputSchema: z.object({
        transactionId: z.string().describe("ID of the transaction to modify"),
        amount: z.number().optional().describe("New amount for the transaction"),
        category: z.string().optional().describe("New category name for the transaction"),
        date: z.string().optional().describe("New date for the transaction in YYYY-MM-DD format"),
        description: z.string().optional().describe("New description for the transaction"),
      }),
      execute: async (args) => {
        const updateData: any = {};
        if (args.amount !== undefined) updateData.amount = args.amount;
        if (args.category !== undefined) updateData.categoryName = args.category;
        if (args.date !== undefined) {
          const newDate = parseFlexibleDate(args.date, new Date());
          newDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
          updateData.date = newDate;
        }
        if (args.description !== undefined) updateData.description = args.description;

        try {
          const updatedTransaction = await prisma.transaction.update({
            where: {
              id: args.transactionId,
            },
            data: updateData,
          });

          return {
            success: true,
            transaction: {
              id: updatedTransaction.id,
              amount: updatedTransaction.amount,
              category: updatedTransaction.categoryId,
              date: updatedTransaction.date.toISOString(),
              description: updatedTransaction.description,
            },
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || "Failed to modify transaction",
          };
        }
      },
    }),
  };
}
