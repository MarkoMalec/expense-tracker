"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  trigger: React.ReactNode;
}

function ImportTransactionsDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();
      if (fileExtension === "csv" || fileExtension === "xls" || fileExtension === "xlsx") {
        setFile(selectedFile);
      } else {
        toast.error("Please select a CSV or Excel file");
        e.target.value = "";
      }
    }
  };

  const handleImport = useCallback(async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    const toastId = "import-transactions";
    toast.loading("Importing transactions...", { id: toastId });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to import transactions");
      }

      toast.success(
        `Successfully imported ${result.imported} transaction(s)! ${
          result.skipped > 0 ? `Skipped ${result.skipped} invalid row(s).` : ""
        }${result.imported > 0 ? "\n\nTip: Use the date picker to view transactions from different months." : ""}`,
        { id: toastId, duration: 5000 }
      );

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries(); // Invalidate all queries to ensure everything updates

      setFile(null);
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to import transactions", {
        id: toastId,
      });
    } finally {
      setIsUploading(false);
    }
  }, [file, queryClient]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Bank Transactions</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Upload a CSV or Excel file exported from your bank account. The file should contain
              transaction data with columns for date, type (Uplata/Isplata), amount, and description.
            </p>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Click to upload file</p>
                    <p className="text-xs text-muted-foreground">
                      CSV, XLS, or XLSX files supported
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Expected format:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Date columns: "Datum knjiženja" or similar</li>
              <li>Type: "Uplata/isplata" (Uplata = Income, Isplata = Expense)</li>
              <li>Amount: "Iznos isplate" or "Iznos uplate"</li>
              <li>Description: "Opis plaćanja" or merchant name</li>
            </ul>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={isUploading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleImport}
            disabled={!file || isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import Transactions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportTransactionsDialog;
