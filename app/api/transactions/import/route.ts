import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

// Helper function to parse Croatian bank CSV format
function parseDate(dateValue: any): Date | null {
  try {
    // Handle Excel serial date numbers
    if (typeof dateValue === 'number') {
      // Excel serial date: days since December 30, 1899
      // The value 1 = January 1, 1900
      // Excel has a leap year bug: treats 1900 as leap year (it wasn't)
      
      // Method: Use Unix epoch conversion
      // Excel epoch starts at Jan 0, 1900 (which is Dec 31, 1899)
      // Unix epoch starts at Jan 1, 1970
      // Days between: 25569
      const unixTimestamp = (dateValue - 25569) * 86400 * 1000;
      const date = new Date(unixTimestamp);
      
      // Validate the date
      const year = date.getFullYear();
      if (!isNaN(date.getTime()) && year >= 1900 && year <= 2100) {
        // Normalize to local midnight
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      }
      
      console.log("Date validation failed:", {
        serial: dateValue,
        converted: date,
        year: year
      });
    }
    
    // Handle Date objects
    if (dateValue instanceof Date) {
      const year = dateValue.getFullYear();
      if (!isNaN(dateValue.getTime()) && year >= 1900 && year <= 2100) {
        return dateValue;
      }
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      const dateStr = dateValue.trim();
      
      // Remove trailing slash if present (e.g., "01/12/2025/")
      const cleanDate = dateStr.replace(/\/$/, "");
      
      // Try DD/MM/YYYY format
      const parts = cleanDate.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime()) && year >= 1900 && year <= 2100) {
          return date;
        }
      }
      
      // Try parsing as ISO date or other standard formats
      const parsed = new Date(dateStr);
      const year = parsed.getFullYear();
      if (!isNaN(parsed.getTime()) && year >= 1900 && year <= 2100) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Error parsing date:", dateValue, error);
  }
  return null;
}

// Helper function to parse amount (handles comma as decimal separator)
function parseAmount(amountValue: any): number | null {
  try {
    // Handle numbers directly
    if (typeof amountValue === 'number') {
      if (!isNaN(amountValue) && amountValue > 0) {
        return Math.round(amountValue * 100) / 100; // Round to 2 decimal places
      }
      return null;
    }
    
    // Handle strings
    if (typeof amountValue === 'string') {
      const amountStr = amountValue.trim();
      if (!amountStr || amountStr === "") return null;
      
      // Replace comma with dot for decimal separator and remove any spaces
      const cleaned = amountStr.replace(/\s/g, "").replace(",", ".");
      const amount = parseFloat(cleaned);
      
      if (!isNaN(amount) && amount > 0) {
        return Math.round(amount * 100) / 100; // Round to 2 decimal places
      }
    }
  } catch (error) {
    console.error("Error parsing amount:", amountValue, error);
  }
  return null;
}

// Helper function to extract description from transaction
function extractDescription(row: any): string {
  // Search terms for description fields (will match if column contains this text)
  const descriptionSearchTerms = [
    "Opis plaćanja",
    "Opis",
    "Naziv primatelja",
    "Naziv platitelja", 
    "Krajnji primatelj",
    "Stvarni dužnik",
  ];
  
  const rowKeys = Object.keys(row);
  
  for (const searchTerm of descriptionSearchTerms) {
    const matchingKey = rowKeys.find(key => 
      key.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (matchingKey && row[matchingKey] && String(row[matchingKey]).trim()) {
      return String(row[matchingKey]).trim();
    }
  }
  
  return "Imported transaction";
}

// Helper function to determine category icon based on description
function getCategoryIcon(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes("tobacco") || lowerDesc.includes("cigarete")) return "🚬";
  if (lowerDesc.includes("studenac") || lowerDesc.includes("konzum") || lowerDesc.includes("lidl")) return "🛒";
  if (lowerDesc.includes("fitness") || lowerDesc.includes("gym")) return "💪";
  if (lowerDesc.includes("wolt") || lowerDesc.includes("uber") || lowerDesc.includes("glovo")) return "🍔";
  if (lowerDesc.includes("spotify") || lowerDesc.includes("netflix") || lowerDesc.includes("rtl")) return "🎵";
  if (lowerDesc.includes("steam") || lowerDesc.includes("riot") || lowerDesc.includes("game")) return "🎮";
  if (lowerDesc.includes("petrol") || lowerDesc.includes("benzin") || lowerDesc.includes("fuel")) return "⛽";
  if (lowerDesc.includes("ljekarna") || lowerDesc.includes("pharmacy") || lowerDesc.includes("apteka")) return "💊";
  if (lowerDesc.includes("prijenos") || lowerDesc.includes("transfer")) return "💸";
  if (lowerDesc.includes("pozajmica") || lowerDesc.includes("loan")) return "💰";
  
  return "💳"; // Default icon
}

// Helper function to get or create category
async function getOrCreateCategory(
  userId: string,
  description: string,
  type: "income" | "expense"
): Promise<string> {
  const icon = getCategoryIcon(description);
  
  // Try to find existing "Imported" category for this type
  let category = await prisma.category.findFirst({
    where: {
      userId,
      name: "Imported",
      type,
    },
  });
  
  // If not found, create it
  if (!category) {
    category = await prisma.category.create({
      data: {
        userId,
        name: "Imported",
        icon,
        type,
      },
    });
  }
  
  return category.id;
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Parse the file using xlsx
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(data, { type: "array" });
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a valid CSV or Excel file." },
        { status: 400 }
      );
    }

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Try to find the header row by looking for key columns across multiple cells
    let headerRow = 0;
    for (let row = 0; row < Math.min(10, range.e.r); row++) {
      let hasDateColumn = false;
      let hasTypeColumn = false;
      let hasAmountColumn = false;
      
      // Check multiple columns in this row
      for (let col = 0; col < Math.min(10, range.e.c); col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellValue = String(cell.v).toLowerCase();
          
          // Check for date column header (but not "datum i vrijeme kreiranja")
          if (cellValue.includes('datum') && cellValue.includes('knjiženja')) {
            hasDateColumn = true;
          }
          // Check for transaction type column
          if (cellValue.includes('uplata') && cellValue.includes('isplata')) {
            hasTypeColumn = true;
          }
          // Check for amount columns
          if (cellValue.includes('iznos')) {
            hasAmountColumn = true;
          }
        }
      }
      
      // If we found at least 2 of the 3 key columns, this is likely the header row
      if ((hasDateColumn && hasTypeColumn) || (hasDateColumn && hasAmountColumn) || (hasTypeColumn && hasAmountColumn)) {
        headerRow = row;
        break;
      }
    }

    // Convert to JSON starting from the detected header row
    const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { 
      range: headerRow,
      defval: "" 
    });

    if (!rawJsonData || rawJsonData.length === 0) {
      return NextResponse.json(
        { error: "No data found in file" },
        { status: 400 }
      );
    }

    // Normalize column names by removing newlines and extra spaces
    const jsonData = rawJsonData.map((row: any) => {
      const normalizedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        // Normalize key: remove newlines, extra spaces, and trim
        const normalizedKey = key.replace(/\s+/g, ' ').trim();
        normalizedRow[normalizedKey] = value;
      }
      return normalizedRow;
    });

    // Log the column headers for debugging
    if (jsonData.length > 0) {
      console.log("Normalized column headers:", Object.keys(jsonData[0]));
    }

    let imported = 0;
    let skipped = 0;

    // Helper to find column value by checking if key contains the search term
    const findColumnValue = (row: any, searchTerms: string[]): any => {
      const rowKeys = Object.keys(row);
      
      for (const searchTerm of searchTerms) {
        const matchingKey = rowKeys.find(key => 
          key.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (matchingKey && row[matchingKey] !== undefined && 
            row[matchingKey] !== null && row[matchingKey] !== "") {
          // Return raw value for dates (numbers), but trim strings
          const value = row[matchingKey];
          return typeof value === 'string' ? value.trim() : value;
        }
      }
      return undefined;
    };

    // Process each row
    for (const row of jsonData as any[]) {
      try {
        // Skip empty rows or summary rows
        const rowValues = Object.values(row).filter(v => v !== undefined && v !== null && v !== "");
        if (rowValues.length < 3) {
          skipped++;
          continue;
        }

        // Parse date - search for columns containing "Datum" and "knjiženja"
        const dateValue = findColumnValue(row, ["Datum knjiženja", "Datum"]);
        
        if (!dateValue) {
          console.log("Skipping row - no date field found. Available keys:", Object.keys(row).slice(0, 5));
          skipped++;
          continue;
        }

        const date = parseDate(dateValue);
        if (!date) {
          console.log("Skipping row - invalid date:", dateValue, "type:", typeof dateValue);
          skipped++;
          continue;
        }

        // Determine transaction type - search for "Uplata/isplata"
        const transactionType = findColumnValue(row, ["Uplata/isplata", "Uplata"]);
        
        if (!transactionType) {
          console.log("Skipping row - no transaction type. Available keys:", Object.keys(row).slice(0, 5));
          skipped++;
          continue;
        }

        const isIncome = transactionType.toLowerCase().includes("uplata") && 
                        !transactionType.toLowerCase().includes("isplata");
        const type: "income" | "expense" = isIncome ? "income" : "expense";

        // Parse amount - search for appropriate amount column
        const amountStr = isIncome 
          ? findColumnValue(row, ["Iznos uplate", "uplate"])
          : findColumnValue(row, ["Iznos isplate", "isplate"]);

        if (!amountStr) {
          console.log(`Skipping row - no amount field for ${type}. Type was: ${transactionType}`);
          skipped++;
          continue;
        }

        const amount = parseAmount(amountStr);
        if (!amount || amount <= 0) {
          console.log("Skipping row - invalid amount:", amountStr);
          skipped++;
          continue;
        }

        // Extract description
        const description = extractDescription(row);

        // Get or create category
        const categoryId = await getOrCreateCategory(user.id, description, type);

        // Log what we're about to save
        console.log("Importing transaction:", {
          date: date.toISOString(),
          utcDate: date.getUTCDate(),
          utcMonth: date.getUTCMonth(),
          utcYear: date.getUTCFullYear(),
          amount,
          type,
          description: description.substring(0, 30)
        });

        // Create transaction and update history in a transaction
        await prisma.$transaction([
          // Create the transaction
          prisma.transaction.create({
            data: {
              userId: user.id,
              amount,
              description,
              date,
              type,
              categoryId,
            },
          }),

          // Update month history
          prisma.monthHistory.upsert({
            where: {
              day_month_year_userId: {
                userId: user.id,
                day: date.getUTCDate(),
                month: date.getUTCMonth(),
                year: date.getUTCFullYear(),
              },
            },
            create: {
              userId: user.id,
              day: date.getUTCDate(),
              month: date.getUTCMonth(),
              year: date.getUTCFullYear(),
              expense: type === "expense" ? amount : 0,
              income: type === "income" ? amount : 0,
            },
            update: {
              expense: {
                increment: type === "expense" ? amount : 0,
              },
              income: {
                increment: type === "income" ? amount : 0,
              },
            },
          }),

          // Update year history
          prisma.yearHistory.upsert({
            where: {
              month_year_userId: {
                userId: user.id,
                month: date.getUTCMonth(),
                year: date.getUTCFullYear(),
              },
            },
            create: {
              userId: user.id,
              month: date.getUTCMonth(),
              year: date.getUTCFullYear(),
              expense: type === "expense" ? amount : 0,
              income: type === "income" ? amount : 0,
            },
            update: {
              expense: {
                increment: type === "expense" ? amount : 0,
              },
              income: {
                increment: type === "income" ? amount : 0,
              },
            },
          }),
        ]);

        imported++;
      } catch (error) {
        console.error("Error processing row:", error);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      message: `Successfully imported ${imported} transaction(s)`,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import transactions" },
      { status: 500 }
    );
  }
}
