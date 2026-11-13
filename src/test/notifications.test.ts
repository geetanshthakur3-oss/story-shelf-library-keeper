import { describe, expect, it } from "vitest";
import { buildNotifications } from "@/lib/notifications";
import type { Loan } from "@/lib/queries";

const baseLoan: Loan = {
  id: "loan-1",
  book_id: "book-1",
  member_id: "member-1",
  issued_at: "2026-10-01T10:00:00Z",
  due_date: "2026-11-15",
  returned_at: null,
  fine_amount: 0,
  fine_paid: false,
  books: { title: "Sapiens", author: "Yuval Noah Harari" },
  profiles: { full_name: "A Reader", email: "reader@example.com" },
};

describe("notifications", () => {
  it("reminds about a book due within three days", () => {
    const items = buildNotifications([baseLoan], false, [], new Date(2026, 10, 13));
    expect(items[0]).toMatchObject({ title: "Sapiens is due in 2 days", href: "/loans" });
  });

  it("uses the live ₹5 per day fine for an overdue book", () => {
    const items = buildNotifications([{ ...baseLoan, due_date: "2026-11-10" }], false, [], new Date(2026, 10, 13));
    expect(items[0]?.description).toContain("₹15");
  });

  it("shows an unpaid fine after return", () => {
    const items = buildNotifications([{ ...baseLoan, returned_at: "2026-11-12T10:00:00Z", fine_amount: 10 }], false, [], new Date(2026, 10, 13));
    expect(items[0]).toMatchObject({ title: "Unpaid fine for Sapiens" });
  });
});
