"use client";

import { UpdateUserCurrency } from "@/app/wizard/_actions/useSettings";
import { CurrencyComboBox } from "@/components/CurrencyComboBox";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserSettings } from "@prisma/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

function WizardForm() {
  const router = useRouter();
  const [initialBalance, setInitialBalance] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userSettings = useQuery<UserSettings>({
    queryKey: ["userSettings"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
  });

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);

      const balance = parseFloat(initialBalance);
      if (!isNaN(balance)) {
        const response = await fetch("/api/user-settings/initial-balance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initialBalance: balance }),
        });

        if (!response.ok) {
          throw new Error("Failed to save initial balance");
        }
      }

      toast.success("Setup completed successfully! 🎉");
      router.push("/");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = userSettings.data?.currency;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Currency</CardTitle>
          <CardDescription>
            Set your default currency for transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurrencyComboBox />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Initial Balance (Optional)</CardTitle>
          <CardDescription>
            Set your starting balance. This won't count as income in your
            statistics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="initialBalance">Starting Balance</Label>
            <Input
              id="initialBalance"
              name="initialBalance"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Enter the amount you currently have (e.g., your bank account
              balance)
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Button
        className="w-full"
        onClick={handleComplete}
        disabled={!canProceed || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting up...
          </>
        ) : (
          "I'm done! Take me to the dashboard"
        )}
      </Button>

      <div className="mt-8">
        <Logo />
      </div>
    </>
  );
}

export default WizardForm;
