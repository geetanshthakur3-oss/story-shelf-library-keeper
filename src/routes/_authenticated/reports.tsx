import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FileBarChart, FileSpreadsheet, FileText, IndianRupee, Loader2, RotateCcw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { fetchBooks, fetchLoans } from "@/lib/queries";
import { useLibraryUser } from "@/hooks/use-library-user";
import { booksByCategory, buildMonthlyActivity } from "@/lib/reports";
import { exportLibraryExcel, exportLibraryPdf } from "@/lib/exports";
import { rupees } from "@/lib/library";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState } from "@/components/AsyncState";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Library reports — Shelfwise" },
      { name: "description", content: "Live circulation, collection, and fine reports with PDF and Excel exports." },
      { property: "og:title", content: "Library reports — Shelfwise" },
      { property: "og:description", content: "Understand library activity and download PDF or Excel reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { data: me, isLoading: meLoading } = useLibraryUser();
  const loansQuery = useQuery({ queryKey: ["loans"], queryFn: fetchLoans, enabled: !!me?.isLibrarian });
  const booksQuery = useQuery({ queryKey: ["books"], queryFn: fetchBooks, enabled: !!me?.isLibrarian });
  const [months, setMonths] = useState("6");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const loans = useMemo(() => loansQuery.data ?? [], [loansQuery.data]);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const monthly = useMemo(() => buildMonthlyActivity(loans, Number(months)), [loans, months]);
  const categories = useMemo(() => booksByCategory(books).slice(0, 8), [books]);
  const issued = monthly.reduce((sum, row) => sum + row.issued, 0);
  const returned = monthly.reduce((sum, row) => sum + row.returned, 0);
  const assessed = monthly.reduce((sum, row) => sum + row.fines, 0);
  const collected = loans.filter((loan) => loan.fine_paid).reduce((sum, loan) => sum + Number(loan.fine_amount), 0);

  async function download(format: "pdf" | "excel") {
    setExporting(format);
    try {
      if (format === "pdf") await exportLibraryPdf({ loans, books, monthly, months: Number(months) });
      else await exportLibraryExcel({ loans, books, monthly, months: Number(months) });
      toast.success(`${format === "pdf" ? "PDF" : "Excel"} report downloaded`);
    } catch (error) {
      toast.error("Couldn't create the report", { description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setExporting(null);
    }
  }

  if (meLoading) return <LoadingState label="Preparing library reports…" cards={4} />;
  if (me && !me.isLibrarian) return <div className="rounded-2xl border bg-card p-8 text-muted-foreground">Only librarians can view library reports.</div>;
  if (loansQuery.isLoading || booksQuery.isLoading) return <LoadingState label="Building reports from live data…" cards={4} />;
  const error = loansQuery.error ?? booksQuery.error;
  if (error) return <ErrorState error={error} onRetry={() => { loansQuery.refetch(); booksQuery.refetch(); }} />;

  return (
    <div>
      <PageHeader title="Reports & insights" subtitle="Turn live circulation data into clear, useful library decisions." action={<div className="flex gap-2"><Button variant="outline" onClick={() => download("pdf")} disabled={!!exporting}>{exporting === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />}<span className="hidden sm:inline">Export </span>PDF</Button><Button onClick={() => download("excel")} disabled={!!exporting}>{exporting === "excel" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}<span className="hidden sm:inline">Export </span>Excel</Button></div>} />
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-card"><div className="min-w-0"><p className="text-sm font-semibold">Reporting period</p><p className="mt-0.5 text-xs text-muted-foreground">Includes current month activity</p></div><Select value={months} onValueChange={setMonths}><SelectTrigger className="w-36 shrink-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="6">Last 6 months</SelectItem><SelectItem value="12">Last 12 months</SelectItem></SelectContent></Select></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Books issued", value: issued, note: `In the selected ${months} months`, icon: TrendingUp }, { label: "Books returned", value: returned, note: "Completed circulation", icon: RotateCcw }, { label: "Fines assessed", value: rupees(assessed), note: "Fines on returned books", icon: FileBarChart }, { label: "Fines collected", value: rupees(collected), note: "All recorded paid fines", icon: IndianRupee }].map((stat) => <article key={stat.label} className="rounded-2xl border bg-card p-5 shadow-card"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{stat.label}</p><stat.icon className="h-4 w-4 text-primary" /></div><p className="mt-3 text-2xl font-extrabold">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.note}</p></article>)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-card sm:p-6"><h2 className="font-sans text-lg font-bold">Monthly circulation</h2><p className="mt-1 text-xs text-muted-foreground">Hover or tap the bars to compare issues and returns</p><ChartContainer config={{ issued: { label: "Issued", color: "var(--chart-1)" }, returned: { label: "Returned", color: "var(--chart-2)" } }} className="mt-6 h-[300px] w-full aspect-auto"><BarChart data={monthly} margin={{ left: -18, right: 4 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="issued" fill="var(--color-issued)" radius={[5, 5, 0, 0]} /><Bar dataKey="returned" fill="var(--color-returned)" radius={[5, 5, 0, 0]} /></BarChart></ChartContainer></section>
        <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-card sm:p-6"><h2 className="font-sans text-lg font-bold">Collection by category</h2><p className="mt-1 text-xs text-muted-foreground">Live copy counts in the top categories</p>{categories.length ? <ChartContainer config={{ copies: { label: "Copies", color: "var(--chart-1)" } }} className="mt-6 h-[300px] w-full aspect-auto"><BarChart data={categories} layout="vertical" margin={{ left: 12, right: 16 }}><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="copies" fill="var(--color-copies)" radius={[0, 5, 5, 0]} /></BarChart></ChartContainer> : <p className="py-20 text-center text-sm text-muted-foreground">Add books to see category insights.</p>}</section>
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-card"><div className="border-b p-5 sm:px-6"><h2 className="font-sans text-lg font-bold">Monthly report</h2><p className="mt-1 text-xs text-muted-foreground">These live figures are included in your PDF and Excel exports</p></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Issued</TableHead><TableHead className="text-right">Returned</TableHead><TableHead className="text-right">Fines assessed</TableHead></TableRow></TableHeader><TableBody>{[...monthly].reverse().map((row) => <TableRow key={row.key}><TableCell className="font-medium">{row.label}</TableCell><TableCell className="text-right">{row.issued}</TableCell><TableCell className="text-right">{row.returned}</TableCell><TableCell className="text-right">{rupees(row.fines)}</TableCell></TableRow>)}</TableBody></Table></div></section>
    </div>
  );
}
