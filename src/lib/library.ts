export const FINE_PER_DAY = 5; // ₹ per overdue day
export const LOAN_DAYS = 14;

/** Whole days a loan is overdue on `today` (0 if not overdue). */
export function overdueDays(dueDate: string, today: Date = new Date()): number {
  const due = new Date(dueDate + "T00:00:00");
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((t.getTime() - due.getTime()) / 86400000);
  return Math.max(0, diff);
}

export function calcFine(dueDate: string, today: Date = new Date()): number {
  return overdueDays(dueDate, today) * FINE_PER_DAY;
}

export const rupees = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;
