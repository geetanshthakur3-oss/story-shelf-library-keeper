import { describe, expect, it } from "vitest";
import { buildMonthlyActivity, booksByCategory, csvCell } from "@/lib/reports";
import type { Loan } from "@/lib/queries";

const loan = (overrides: Partial<Loan>): Loan => ({
  id: "loan-1",
  book_id: "book-1",
  member_id: "member-1",
  issued_at: "2026-10-04T10:00:00Z",
  due_date: "2026-10-18",
  returned_at: null,
  fine_amount: 0,
  fine_paid: false,
  books: { title: "Sapiens", author: "Yuval Noah Harari" },
  profiles: { full_name: "A Reader", email: "reader@example.com" },
  ...overrides,
});

describe("library reports", () => {
  it("counts issues, returns and collected fine value in their actual months", () => {
    const rows = buildMonthlyActivity([
      loan({ returned_at: "2026-11-02T10:00:00Z", fine_amount: 15 }),
      loan({ id: "loan-2", issued_at: "2026-11-08T10:00:00Z" }),
    ], 2, new Date("2026-11-13T12:00:00Z"));
    expect(rows).toEqual([
      { key: "2026-10", label: "Oct", issued: 1, returned: 0, fines: 0 },
      { key: "2026-11", label: "Nov", issued: 1, returned: 1, fines: 15 },
    ]);
  });

  it("adds up copies by category and keeps uncategorised books", () => {
    expect(booksByCategory([
      { category: "History", total_copies: 2 },
      { category: "History", total_copies: 1 },
      { category: null, total_copies: 4 },
    ])).toEqual([
      { name: "Uncategorised", copies: 4 },
      { name: "History", copies: 3 },
    ]);
  });

  it("escapes commas and quotes in CSV exports", () => {
    expect(csvCell('A "quoted", title')).toBe('"A ""quoted"", title"');
  });
});
