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
import { UserSettings } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wallet } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

interface Props {
  userSettings: UserSettings;
}

function InitialBalanceDialog({ userSettings }: Props) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(
    userSettings.initialBalance.toString()
  );

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (initialBalance: number) => {
      const response = await fetch("/api/user-settings/initial-balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ initialBalance }),
      });

      if (!response.ok) {
        throw new Error("Failed to update initial balance");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Initial balance updated successfully! 🎉");
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to update initial balance");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericBalance = parseFloat(balance);

    if (isNaN(numericBalance)) {
      toast.error("Please enter a valid number");
      return;
    }

    mutate(numericBalance);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wallet className="h-4 w-4" />
          Initial Balance: {userSettings.initialBalance.toFixed(2)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Initial Balance</DialogTitle>
          <DialogDescription>
            Set your starting balance. This amount will be added to your current
            balance but won't affect your income statistics.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Initial Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Enter the amount you had when you started using this app
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

export default InitialBalanceDialog;
