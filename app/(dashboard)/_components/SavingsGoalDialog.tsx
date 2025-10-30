"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GetFormatterForCurrency } from "@/lib/helpers";
import { UserSettings } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, Loader2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

interface Props {
  userSettings: UserSettings;
  trigger?: React.ReactNode;
}

function SavingsGoalDialog({ userSettings, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState(
    userSettings.savingsGoal.toString()
  );

  const queryClient = useQueryClient();
  
  const formatter = useMemo(() => {
    return GetFormatterForCurrency(userSettings.currency);
  }, [userSettings.currency]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (savingsGoal: number) => {
      const response = await fetch("/api/user-settings/savings-goal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ savingsGoal }),
      });

      if (!response.ok) {
        throw new Error("Failed to update savings goal");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Savings goal updated successfully! 🎯");
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to update savings goal");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericGoal = parseFloat(goal);

    if (isNaN(numericGoal) || numericGoal < 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    mutate(numericGoal);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Target className="h-4 w-4" />
      Goal: {formatter.format(userSettings.savingsGoal)}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Monthly Savings Goal</DialogTitle>
          <DialogDescription>
            Set a monthly savings target. We'll show you how much you can still
            spend to reach your goal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal">Monthly Savings Goal</Label>
              <Input
                id="goal"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Enter how much you want to save each month (e.g., 300)
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-900">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 Tip: A good savings goal is typically 20-30% of your income.
                Start small and increase gradually!
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SavingsGoalDialog;
