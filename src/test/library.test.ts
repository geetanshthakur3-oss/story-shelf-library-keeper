import { describe, it, expect } from "vitest";
import { calcFine, overdueDays } from "@/lib/library";

describe("late fines", () => {
  it("no fine on the due date", () => {
    expect(calcFine("2026-11-10", new Date(2026, 10, 10))).toBe(0);
  });
  it("charges ₹5 per overdue day", () => {
    expect(overdueDays("2026-11-10", new Date(2026, 10, 13))).toBe(3);
    expect(calcFine("2026-11-10", new Date(2026, 10, 13))).toBe(15);
  });
  it("no fine before due date", () => {
    expect(calcFine("2026-11-20", new Date(2026, 10, 13))).toBe(0);
  });
});
