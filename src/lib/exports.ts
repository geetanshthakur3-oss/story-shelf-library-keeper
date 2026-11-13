import type { Book, Loan } from "@/lib/queries";
import type { MonthlyActivity } from "@/lib/reports";

export type ExportData = {
  loans: Loan[];
  books: Book[];
  monthly: MonthlyActivity[];
  months: number;
};

export async function exportLibraryPdf({ loans, books, monthly, months }: ExportData) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF();
  const generated = new Date().toLocaleString("en-IN");
  const totalCopies = books.reduce((sum, book) => sum + book.total_copies, 0);
  const available = books.reduce((sum, book) => sum + book.available_copies, 0);
  const active = loans.filter((loan) => !loan.returned_at).length;
  const issued = monthly.reduce((sum, row) => sum + row.issued, 0);
  const returned = monthly.reduce((sum, row) => sum + row.returned, 0);
  const fines = monthly.reduce((sum, row) => sum + row.fines, 0);

  doc.setFillColor(20, 43, 82);
  doc.rect(0, 0, 210, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("Shelfwise Library Report", 14, 17);
  doc.setFontSize(10);
  doc.text(`Last ${months} months  |  Generated ${generated}`, 14, 27);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text("Library summary", 14, 48);
  autoTable(doc, {
    startY: 53,
    head: [["Titles", "Total copies", "Available copies", "Active loans", "Issued", "Returned", "Fines (INR)"]],
    body: [[books.length, totalCopies, available, active, issued, returned, fines]],
    theme: "grid",
    headStyles: { fillColor: [37, 64, 110] },
    styles: { fontSize: 8 },
  });
  doc.text("Monthly circulation", 14, 87);
  autoTable(doc, {
    startY: 92,
    head: [["Month", "Books issued", "Books returned", "Fines assessed (INR)"]],
    body: monthly.map((row) => [row.key, row.issued, row.returned, row.fines]),
    theme: "striped",
    headStyles: { fillColor: [37, 64, 110] },
  });
  doc.save(`shelfwise-report-${months}-months.pdf`);
}

export async function exportLibraryExcel({ loans, books, monthly, months }: ExportData) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["Shelfwise Library Report"],
    [`Reporting period: last ${months} months`],
    [`Generated: ${new Date().toLocaleString("en-IN")}`],
    [],
    ["Metric", "Value"],
    ["Book titles", books.length],
    ["Total copies", books.reduce((sum, book) => sum + book.total_copies, 0)],
    ["Available copies", books.reduce((sum, book) => sum + book.available_copies, 0)],
    ["Active loans", loans.filter((loan) => !loan.returned_at).length],
    ["Fines collected (INR)", loans.filter((loan) => loan.fine_paid).reduce((sum, loan) => sum + Number(loan.fine_amount), 0)],
  ]);
  summary["!cols"] = [{ wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, summary, "Summary");

  const monthlySheet = XLSX.utils.json_to_sheet(monthly.map((row) => ({ Month: row.key, Issued: row.issued, Returned: row.returned, "Fines assessed (INR)": row.fines })));
  monthlySheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, monthlySheet, "Monthly report");

  const transactions = XLSX.utils.json_to_sheet(loans.map((loan) => ({
    "Transaction ID": loan.id,
    Book: loan.books?.title ?? "Unknown",
    Member: loan.profiles?.full_name ?? "Unknown",
    Email: loan.profiles?.email ?? "",
    "Issued at": new Date(loan.issued_at).toLocaleString("en-IN"),
    "Due date": loan.due_date,
    "Returned at": loan.returned_at ? new Date(loan.returned_at).toLocaleString("en-IN") : "Not returned",
    "Fine (INR)": Number(loan.fine_amount),
    "Fine status": Number(loan.fine_amount) > 0 ? (loan.fine_paid ? "Paid" : "Unpaid") : "No fine",
  })));
  transactions["!cols"] = [{ wch: 38 }, { wch: 28 }, { wch: 24 }, { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, transactions, "Transactions");

  const catalog = XLSX.utils.json_to_sheet(books.map((book) => ({ Title: book.title, Author: book.author, ISBN: book.isbn ?? "", Category: book.category ?? "", "Total copies": book.total_copies, "Available copies": book.available_copies })));
  catalog["!cols"] = [{ wch: 34 }, { wch: 26 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, catalog, "Catalog");
  XLSX.writeFile(workbook, `shelfwise-report-${months}-months.xlsx`);
}
