"use client";

import CreateCategoryDialog from "@/app/(dashboard)/_components/CreateCategoryDialog";
import DeleteCategoryDialog from "@/app/(dashboard)/_components/DeleteCategoryDialog";
import InitialBalanceDialog from "@/app/(dashboard)/_components/InitialBalanceDialog";
import BillingCycleDialog from "@/app/(dashboard)/_components/BillingCycleDialog";
import SavingsGoalDialog from "@/app/(dashboard)/_components/SavingsGoalDialog";
import { CurrencyComboBox } from "@/components/CurrencyComboBox";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Category, UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import {
  Pen,
  PlusSquare,
  TrashIcon,
  TrendingDown,
  TrendingUp,
  Settings,
  FolderTree,
  EuroIcon,
  Wallet,
  Calendar,
  Target,
} from "lucide-react";
import React from "react";
import EditCategoryDialog from "../_components/EditCategoryDialog";

function page() {
  const userSettings = useQuery<UserSettings>({
    queryKey: ["userSettings"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
  });

  return (
    <>
      {/* HEADER */}
      <div className="bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-6 pt-8 pb-5">
          <div>
            <p className="text-3xl font-bold">Manage</p>
            <p className="text-muted-foreground">
              Manage your account settings and categories
            </p>
          </div>
        </div>
      </div>
      {/* END HEADER */}
      <div className="container flex-col gap-4 p-4">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="bg-transparent border-b w-full justify-start mb-12 p-0 pb-0 rounded-none">
            <TabsTrigger
              value="settings"
              className="gap-2 rounded-none shadow-none data-[state=active]:border-b-4 data-[state=active]:border-foreground translate-y-[3.45px]"
            >
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="gap-2 rounded-none data-[state=active]:border-b-4 data-[state=active]:border-foreground translate-y-[3.45px]"
            >
              <FolderTree className="h-4 w-4" />
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <SkeletonWrapper isLoading={userSettings.isLoading}>
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your currency, balance, and financial preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Currency Setting */}
                  <div className="group flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1 p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <EuroIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold mb-1.5 flex items-center gap-2">
                          Currency
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Set your default currency for transactions
                        </p>
                      </div>
                    </div>
                    <div className="md:w-[220px] md:ml-4">
                      <CurrencyComboBox />
                    </div>
                  </div>

                  <Separator />

                  {/* Initial Balance Setting */}
                  {userSettings.data && (
                    <>
                      <div className="group flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="mt-1 p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Wallet className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold mb-1.5">
                              Initial Balance
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              Set your starting balance. This won't count as income
                              in your statistics.
                            </p>
                          </div>
                        </div>
                        <div className="md:w-[220px] md:ml-4 flex justify-end">
                          <InitialBalanceDialog
                            userSettings={userSettings.data}
                          />
                        </div>
                      </div>

                      <Separator />
                    </>
                  )}

                  {/* Billing Cycle Setting */}
                  {userSettings.data && (
                    <>
                      <div className="group flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="mt-1 p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold mb-1.5">
                              Billing Cycle
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              Set when your billing cycle starts (e.g., when you
                              receive your salary) and choose your preferred view
                              mode.
                            </p>
                          </div>
                        </div>
                        <div className="md:w-[220px] md:ml-4 flex justify-end">
                          <BillingCycleDialog userSettings={userSettings.data} />
                        </div>
                      </div>

                      <Separator />
                    </>
                  )}

                  {/* Monthly Savings Goal Setting */}
                  {userSettings.data && (
                    <div className="group flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1 p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Target className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold mb-1.5">
                            Monthly Savings Goal
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Set a monthly savings target to track your progress
                            and see how much you can still spend.
                          </p>
                        </div>
                      </div>
                      <div className="md:w-[220px] md:ml-4 flex justify-end">
                        <SavingsGoalDialog userSettings={userSettings.data} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </SkeletonWrapper>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CategoryList type="income" />
            <CategoryList type="expense" />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default page;

function CategoryList({ type }: { type: TransactionType }) {
  const categoriesQuery = useQuery({
    queryKey: ["categories", type],
    queryFn: () =>
      fetch(`/api/categories?type=${type}`).then((res) => res.json()),
  });

  const dataAvailable = categoriesQuery.data && categoriesQuery.data.length > 0;

  return (
    <SkeletonWrapper isLoading={categoriesQuery.isLoading}>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "p-3 rounded-xl",
                  type === "expense"
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {type === "expense" ? (
                  <TrendingDown className="h-6 w-6" />
                ) : (
                  <TrendingUp className="h-6 w-6" />
                )}
              </div>
              <div>
                <CardTitle className="text-xl">
                  {type === "income" ? "Income" : "Expense"} Categories
                </CardTitle>
                <CardDescription className="mt-1">
                  {dataAvailable
                    ? `${categoriesQuery.data.length} ${categoriesQuery.data.length === 1 ? "category" : "categories"}`
                    : "No categories yet"}
                </CardDescription>
              </div>
            </div>

            <CreateCategoryDialog
              type={type}
              successCallback={() => categoriesQuery.refetch()}
              trigger={
                <Button className="gap-2" size="sm">
                  <PlusSquare className="h-4 w-4" />
                  New Category
                </Button>
              }
            />
          </div>
        </CardHeader>
        {!dataAvailable && (
          <div className="flex h-48 w-full flex-col items-center justify-center p-8">
            <div
              className={cn(
                "mb-4 p-4 rounded-full",
                type === "income"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-red-500/10 text-red-600"
              )}
            >
              <FolderTree className="h-8 w-8" />
            </div>
            <p className="text-base font-medium mb-2">
              No{" "}
              <span
                className={cn(
                  type === "income" ? "text-emerald-600" : "text-red-600"
                )}
              >
                {type}
              </span>{" "}
              categories yet
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first category to get started
            </p>
            <CreateCategoryDialog
              type={type}
              successCallback={() => categoriesQuery.refetch()}
              trigger={
                <Button variant="outline" className="gap-2">
                  <PlusSquare className="h-4 w-4" />
                  Create Category
                </Button>
              }
            />
          </div>
        )}
        {dataAvailable && (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {categoriesQuery.data.map((category: Category) => (
                <CategoryCard category={category} key={category.name} />
              ))}
            </div>
          </div>
        )}
      </Card>
    </SkeletonWrapper>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [showActions, setShowActions] = React.useState(false);

  return (
    <div
      className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-xl hover:border-primary/50 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setShowActions(!showActions)}
    >
      {/* Action Buttons - Visible on mobile tap, hover on desktop */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-background/98 via-background/95 to-transparent backdrop-blur-md border-b transition-all duration-300",
          isHovered || showActions ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        )}
      >
        <EditCategoryDialog
          category={category}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Pen className="h-4 w-4" />
              <span className="text-xs font-medium">Edit</span>
            </Button>
          }
        />
        <DeleteCategoryDialog
          category={category}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <TrashIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Delete</span>
            </Button>
          }
        />
      </div>

      {/* Mobile action indicator */}
      <div
        className={cn(
          "absolute top-2 right-2 z-0 md:hidden transition-all duration-300",
          showActions ? "opacity-0" : "opacity-60"
        )}
      >
        <div className="p-1.5 rounded-full bg-muted">
          <svg
            className="h-3 w-3 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </div>
      </div>

      {/* Category Content */}
      <div className="flex flex-col items-center justify-center p-6 pt-8 pb-5 min-h-[160px]">
        {/* Icon with animated background and pulse effect */}
        <div className="relative mb-4">
          {/* Pulse ring on hover */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl transition-all duration-500",
              category.type === "income"
                ? "bg-emerald-500/20"
                : "bg-red-500/20",
              isHovered ? "scale-125 opacity-0" : "scale-100 opacity-0"
            )}
          />
          <div
            className={cn(
              "relative flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300 shadow-sm",
              category.type === "income"
                ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 group-hover:from-emerald-500/20 group-hover:to-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:shadow-emerald-500/20"
                : "bg-gradient-to-br from-red-500/10 to-red-500/5 group-hover:from-red-500/20 group-hover:to-red-500/10 text-red-600 dark:text-red-400 group-hover:shadow-red-500/20",
              isHovered && "shadow-lg"
            )}
          >
            <span
              className={cn(
                "text-5xl transition-all duration-300",
                isHovered && "scale-110 rotate-6"
              )}
              role="img"
            >
              {category.icon}
            </span>
          </div>
        </div>

        {/* Category Name with better typography */}
        <h3 className="text-center text-base font-semibold line-clamp-2 px-2 mb-2 transition-colors group-hover:text-primary min-h-[2.5rem] flex items-center">
          {category.name}
        </h3>

        {/* Type badge with icon */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300",
            category.type === "income"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20",
            isHovered ? "opacity-100 translate-y-0" : "opacity-70 translate-y-1"
          )}
        >
          {category.type === "income" ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {category.type}
        </div>
      </div>

      {/* Bottom gradient accent with animation */}
      <div className="relative h-1 w-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 transition-all duration-500",
            category.type === "income"
              ? "bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
              : "bg-gradient-to-r from-transparent via-red-500 to-transparent",
            isHovered ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
          )}
        />
      </div>

      {/* Shine effect overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent transition-opacity duration-300 pointer-events-none",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
