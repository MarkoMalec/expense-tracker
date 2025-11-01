"use server";

import prisma from "@/lib/prisma";
import {
  CreateTransactionSchema,
  CreateTransactionSchemaType,
} from "@/schema/transaction";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function CreateTransaction(form: CreateTransactionSchemaType) {
  const parsedBody = CreateTransactionSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { amount, category, date, description, type } = parsedBody.data;
  const categoryRow = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: category,
    },
  });

  if (!categoryRow) {
    throw new Error("category not found");
  }

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: user.id,
        amount,
        date,
        description: description || "",
        type,
        categoryId: categoryRow.id,
      },
    }),

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
}

export async function UpdateTransaction(
  id: string,
  form: CreateTransactionSchemaType
) {
  const parsedBody = CreateTransactionSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const transaction = await prisma.transaction.findUnique({
    where: {
      userId: user.id,
      id,
    },
  });

  if (!transaction) {
    throw new Error("bad request");
  }

  const { amount, category, date, description, type } = parsedBody.data;
  const categoryRow = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: category,
    },
  });

  if (!categoryRow) {
    throw new Error("category not found");
  }

  await prisma.transaction.update({
    where: {
      id,
      userId: user.id,
    },
    data: {
      amount,
      date,
      description: description || "",
      type,
      categoryId: categoryRow.id,
    },
  });
}

export async function DeleteTransaction(id: string) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const transaction = await prisma.transaction.findUnique({
    where: {
      userId: user.id,
      id,
    },
  });

  if (!transaction) {
    throw new Error("bad request");
  }

  await prisma.$transaction([
    // Delete transaction from db
    prisma.transaction.delete({
      where: {
        id,
        userId: user.id,
      },
    }),
    // Update month history
    prisma.monthHistory.update({
      where: {
        day_month_year_userId: {
          userId: user.id,
          day: transaction.date.getUTCDate(),
          month: transaction.date.getUTCMonth(),
          year: transaction.date.getUTCFullYear(),
        },
      },
      data: {
        ...(transaction.type === "expense" && {
          expense: {
            decrement: transaction.amount,
          },
        }),
        ...(transaction.type === "income" && {
          income: {
            decrement: transaction.amount,
          },
        }),
      },
    }),
    // Update year history
    prisma.yearHistory.update({
      where: {
        month_year_userId: {
          userId: user.id,
          month: transaction.date.getUTCMonth(),
          year: transaction.date.getUTCFullYear(),
        },
      },
      data: {
        ...(transaction.type === "expense" && {
          expense: {
            decrement: transaction.amount,
          },
        }),
        ...(transaction.type === "income" && {
          income: {
            decrement: transaction.amount,
          },
        }),
      },
    }),
  ]);
}

