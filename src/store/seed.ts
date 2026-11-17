import { uuid } from "@/lib/training/draft-from-day";
import type { AppData, Category } from "./types";

const EXPENSE = ["Comida", "Transporte", "Casa", "Servicios", "Salud", "Ocio", "Compras", "Otros"];
const INCOME = ["Sueldo", "Otros"];

export function seedCategories(): Category[] {
  return [
    ...EXPENSE.map((name) => ({ id: uuid(), name, kind: "expense" as const, archived: false })),
    ...INCOME.map((name) => ({ id: uuid(), name, kind: "income" as const, archived: false })),
  ];
}

export function emptyData(): AppData {
  return {
    version: 1,
    accounts: [],
    categories: seedCategories(),
    movements: [],
    exercises: [],
    routines: [],
    sessions: [],
    draft: null,
    settings: { lastAccountId: null, lastCategoryId: { expense: null, income: null } },
  };
}
