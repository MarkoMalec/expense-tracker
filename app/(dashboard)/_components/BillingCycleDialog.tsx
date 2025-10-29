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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSettings } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

interface Props {
  userSettings: UserSettings;
}

function BillingCycleDialog({ userSettings }: Props) {
  const [open, setOpen] = useState(false);
  const [cycleDay, setCycleDay] = useState(
    userSettings.billingCycleDay.toString()
  );
  const [preferredView, setPreferredView] = useState(
    userSettings.preferredView
  );

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: { billingCycleDay: number; preferredView: string }) => {
      const response = await fetch("/api/user-settings/billing-cycle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update billing cycle");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Billing cycle updated successfully! 🎉");
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to update billing cycle");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const day = parseInt(cycleDay);

    if (isNaN(day) || day < 1 || day > 28) {
      toast.error("Please enter a valid day between 1 and 28");
      return;
    }

    mutate({ billingCycleDay: day, preferredView });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarRange className="h-4 w-4" />
          Billing Cycle: Day {userSettings.billingCycleDay}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Billing Cycle</DialogTitle>
          <DialogDescription>
            Set the day of the month when your billing cycle starts (e.g., when
            you receive your salary). This helps track your finances more
            accurately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cycleDay">Billing Cycle Start Day</Label>
              <Select
                value={cycleDay}
                onValueChange={setCycleDay}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st - Start of month</SelectItem>
                  {Array.from({ length: 27 }, (_, i) => i + 2).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                      {day === 15
                        ? " - Mid-month"
                        : day === 25
                        ? " - Common salary day"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose day 1-28 (we limit to 28 to avoid month-end issues)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredView">Default View</Label>
              <Select
                value={preferredView}
                onValueChange={setPreferredView}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar">
                    Calendar Month (1st - End)
                  </SelectItem>
                  <SelectItem value="billing">
                    Billing Cycle (e.g., 25th - 24th)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You can always toggle between views in the Overview
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

export default BillingCycleDialog;
