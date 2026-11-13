import { calcFine, rupees } from "@/lib/library";
import type { Loan } from "@/lib/queries";

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  href: "/loans" | "/books";
  tone: "urgent" | "reminder" | "info";
};

function daysUntil(dueDate: string, today: Date) {
  const due = new Date(`${dueDate}T00:00:00`);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - current.getTime()) / 86400000);
}

export function buildNotifications(
  loans: Loan[],
  isLibrarian: boolean,
  books: { id: string; title: string; available_copies: number }[] = [],
  now = new Date(),
): AppNotification[] {
  const notifications: AppNotification[] = [];

  for (const loan of loans) {
    const book = loan.books?.title ?? "A book";
    const member = isLibrarian && loan.profiles?.full_name ? ` · ${loan.profiles.full_name}` : "";
    if (!loan.returned_at) {
      const fine = calcFine(loan.due_date, now);
      const remaining = daysUntil(loan.due_date, now);
      if (fine > 0) {
        notifications.push({
          id: `overdue-${loan.id}-${loan.due_date}`,
          title: `${book} is overdue`,
          description: `${rupees(fine)} fine so far${member}`,
          href: "/loans",
          tone: "urgent",
        });
      } else if (remaining >= 0 && remaining <= 3) {
        notifications.push({
          id: `due-${loan.id}-${loan.due_date}`,
          title: remaining === 0 ? `${book} is due today` : `${book} is due in ${remaining} day${remaining === 1 ? "" : "s"}`,
          description: `Return by ${loan.due_date}${member}`,
          href: "/loans",
          tone: "reminder",
        });
      }
    } else if (!loan.fine_paid && Number(loan.fine_amount) > 0) {
      notifications.push({
        id: `fine-${loan.id}-${loan.returned_at}`,
        title: `Unpaid fine for ${book}`,
        description: `${rupees(Number(loan.fine_amount))} outstanding${member}`,
        href: "/loans",
        tone: "reminder",
      });
    }
  }

  if (isLibrarian) {
    for (const book of books.filter((item) => item.available_copies === 0)) {
      notifications.push({
        id: `stock-${book.id}`,
        title: `${book.title} is out of stock`,
        description: "All copies are currently on loan",
        href: "/books",
        tone: "info",
      });
    }
  }

  return notifications.slice(0, 20);
}
