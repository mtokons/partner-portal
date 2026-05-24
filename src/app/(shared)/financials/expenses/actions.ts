"use server";

import { createExpense, createActivity } from "@/lib/sharepoint";

interface AddExpenseInput {
  partnerId: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

export async function addExpenseAction(input: AddExpenseInput) {
  const expense = await createExpense({
    partnerId: input.partnerId,
    category: input.category,
    amount: input.amount,
    description: input.description,
    date: input.date,
  });

  await createActivity({
    partnerId: input.partnerId,
    type: "expense",
    description: `Expense logged: ${input.category} — €${input.amount.toFixed(2)}`,
    relatedId: expense.id,
    createdAt: new Date().toISOString(),
  });

  return expense;
}
