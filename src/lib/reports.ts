import type { Loan } from "@/lib/queries";

export type MonthlyActivity = {
  key: string;
  label: string;
  issued: number;
  returned: number;
  fines: number;
};

export function buildMonthlyActivity(loans: Loan[], months = 6, now = new Date()): MonthlyActivity[] {
  const count = Math.max(1, Math.min(24, Math.floor(months)));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - count + 1, 1));
  const result: MonthlyActivity[] = Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
    const key = date.toISOString().slice(0, 7);
    return {
      key,
      label: date.toLocaleDateString("en-IN", { month: "short", year: count > 12 ? "2-digit" : undefined, timeZone: "UTC" }),
      issued: 0,
      returned: 0,
      fines: 0,
    };
  });
  const byMonth = new Map(result.map((month) => [month.key, month]));

  for (const loan of loans) {
    const issued = byMonth.get(loan.issued_at.slice(0, 7));
    if (issued) issued.issued += 1;
    if (loan.returned_at) {
      const returned = byMonth.get(loan.returned_at.slice(0, 7));
      if (returned) {
        returned.returned += 1;
        returned.fines += Number(loan.fine_amount);
      }
    }
  }
  return result;
}

export function booksByCategory(books: { category: string | null; total_copies: number }[]) {
  const categories = new Map<string, number>();
  for (const book of books) {
    const name = book.category?.trim() || "Uncategorised";
    categories.set(name, (categories.get(name) ?? 0) + book.total_copies);
  }
  return [...categories.entries()]
    .map(([name, copies]) => ({ name, copies }))
    .sort((a, b) => b.copies - a.copies);
}

export function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
