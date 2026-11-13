import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, BookOpenCheck, CalendarDays, Check, Clock3, IndianRupee, Loader2, RotateCcw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchBooks, fetchLoans, fetchMembers, type Loan } from "@/lib/queries";
import { calcFine, rupees, FINE_PER_DAY, LOAN_DAYS } from "@/lib/library";
import { useLibraryUser } from "@/hooks/use-library-user";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState } from "@/components/AsyncState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/loans")({
  head: () => ({
    meta: [
      { title: "Circulation & transactions — Shelfwise" },
      { name: "description", content: "Issue and return books, track due dates, automatic fines, and complete borrowing history." },
      { property: "og:title", content: "Circulation & transactions — Shelfwise" },
      { property: "og:description", content: "Complete library issue, return, fine, and transaction records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Loans,
});

function Loans() {
  const { data: me, isLoading: meLoading } = useLibraryUser();
  const qc = useQueryClient();
  const lib = !!me?.isLibrarian;
  const loansQuery = useQuery({ queryKey: ["loans"], queryFn: fetchLoans });
  const booksQuery = useQuery({ queryKey: ["books"], queryFn: fetchBooks, enabled: lib });
  const membersQuery = useQuery({ queryKey: ["members"], queryFn: fetchMembers, enabled: lib });
  const [bookId, setBookId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [days, setDays] = useState(LOAN_DAYS);
  const [q, setQ] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const loans = useMemo(() => loansQuery.data ?? [], [loansQuery.data]);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const active = loans.filter((loan) => !loan.returned_at);
  const overdue = active.filter((loan) => calcFine(loan.due_date) > 0);
  const history = loans.filter((loan) => loan.returned_at);
  const fines = loans.filter((loan) => loan.returned_at ? Number(loan.fine_amount) > 0 : calcFine(loan.due_date) > 0);
  const outstanding = loans.reduce((sum, loan) => sum + (loan.returned_at ? (!loan.fine_paid ? Number(loan.fine_amount) : 0) : calcFine(loan.due_date)), 0);
  const filtered = (rows: Loan[]) => rows.filter((loan) => `${loan.books?.title ?? ""} ${loan.books?.author ?? ""} ${loan.profiles?.full_name ?? ""} ${loan.profiles?.email ?? ""} ${loan.id}`.toLowerCase().includes(q.trim().toLowerCase()));
  const duePreview = (() => { const date = new Date(); date.setDate(date.getDate() + (Number.isFinite(days) ? days : LOAN_DAYS)); return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); })();

  async function refresh() { await qc.invalidateQueries(); }

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    if (!bookId || !memberId) { toast.error("Choose a book and a member"); return; }
    if (!Number.isInteger(days) || days < 1 || days > 90) { toast.error("Loan period must be between 1 and 90 days."); return; }
    setIssuing(true);
    const { error } = await supabase.rpc("issue_book", { _book_id: bookId, _member_id: memberId, _days: days });
    setIssuing(false);
    if (error) { toast.error("Couldn't issue the book", { description: error.message }); return; }
    toast.success("Book issued successfully", { description: `Due on ${duePreview}` });
    setBookId("");
    setMemberId("");
    await refresh();
  }

  async function returnBook(loan: Loan) {
    setReturningId(loan.id);
    const { data, error } = await supabase.rpc("return_book", { _loan_id: loan.id, _fine_per_day: FINE_PER_DAY });
    setReturningId(null);
    if (error) { toast.error("Couldn't return the book", { description: error.message }); return; }
    toast.success(Number(data) > 0 ? "Book returned with a late fine" : "Book returned on time", { description: Number(data) > 0 ? `Automatic late fine: ${rupees(Number(data))}` : "No fine due." });
    await refresh();
  }

  async function markPaid(loan: Loan) {
    setPayingId(loan.id);
    const { error } = await supabase.from("loans").update({ fine_paid: true }).eq("id", loan.id);
    setPayingId(null);
    if (error) { toast.error("Couldn't update the fine", { description: error.message }); return; }
    toast.success("Fine marked as paid");
    await refresh();
  }

  if (meLoading || loansQuery.isLoading || (lib && (booksQuery.isLoading || membersQuery.isLoading))) return <LoadingState label="Loading circulation records…" cards={4} />;
  const error = loansQuery.error ?? booksQuery.error ?? membersQuery.error;
  if (error) return <ErrorState error={error} onRetry={() => { loansQuery.refetch(); if (lib) { booksQuery.refetch(); membersQuery.refetch(); } }} />;

  return (
    <div>
      <PageHeader title={lib ? "Circulation" : "My loans"} subtitle={`Default loan ${LOAN_DAYS} days · automatic late fine ${rupees(FINE_PER_DAY)} per overdue day`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: lib ? "Books issued" : "Books with me", value: active.length, icon: BookOpenCheck }, { label: "Overdue", value: overdue.length, icon: Clock3, urgent: overdue.length > 0 }, { label: "Returned", value: history.length, icon: RotateCcw }, { label: "Outstanding fines", value: rupees(outstanding), icon: IndianRupee, urgent: outstanding > 0 }].map((stat) => <article key={stat.label} className="rounded-2xl border bg-card p-5 shadow-card"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{stat.label}</p><stat.icon className={`h-5 w-5 ${stat.urgent ? "text-destructive" : "text-primary"}`} /></div><p className={`mt-3 text-2xl font-extrabold ${stat.urgent ? "text-destructive" : ""}`}>{stat.value}</p></article>)}
      </div>

      {lib && (
        <section className="mt-6 rounded-2xl border bg-card p-5 shadow-card sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary"><ArrowLeftRight className="h-5 w-5" /></span><div><h2 className="font-sans text-lg font-bold">Issue a book</h2><p className="text-xs text-muted-foreground">Availability and due date update automatically</p></div></div>
          <form onSubmit={issue} className="grid items-end gap-4 lg:grid-cols-[1fr_1fr_130px_150px_auto]">
            <div className="space-y-2"><Label>Book</Label><Select value={bookId} onValueChange={setBookId}><SelectTrigger className="w-full"><SelectValue placeholder="Choose an available book" /></SelectTrigger><SelectContent>{books.map((book) => <SelectItem key={book.id} value={book.id} disabled={book.available_copies < 1}>{book.title} · {book.available_copies} available</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Member</Label><Select value={memberId} onValueChange={setMemberId}><SelectTrigger className="w-full"><SelectValue placeholder="Choose a member" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.full_name} · {member.email}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="loan-days">Days</Label><Input id="loan-days" type="number" min={1} max={90} step={1} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
            <div className="rounded-xl bg-muted px-3 py-2 text-xs"><span className="flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Due date</span><p className="mt-1 font-semibold">{duePreview}</p></div>
            <Button type="submit" disabled={issuing || !bookId || !memberId}>{issuing ? <Loader2 className="animate-spin" /> : <ArrowLeftRight />}{issuing ? "Issuing…" : "Issue book"}</Button>
          </form>
        </section>
      )}

      <div className="relative my-6 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-10 bg-card pl-9" placeholder={lib ? "Search book, member, or transaction ID" : "Search your transactions"} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Tabs defaultValue="active">
        <TabsList className="h-auto max-w-full flex-wrap justify-start"><TabsTrigger value="active">On loan ({active.length})</TabsTrigger><TabsTrigger value="fines">Fines ({fines.length})</TabsTrigger><TabsTrigger value="history">History & transactions ({history.length})</TabsTrigger></TabsList>
        <TabsContent value="active"><LoanTable rows={filtered(active)} lib={lib} onReturn={returnBook} onPaid={markPaid} returningId={returningId} payingId={payingId} /></TabsContent>
        <TabsContent value="fines"><LoanTable rows={filtered(fines)} lib={lib} onReturn={returnBook} onPaid={markPaid} returningId={returningId} payingId={payingId} /></TabsContent>
        <TabsContent value="history"><LoanTable rows={filtered(history)} lib={lib} onReturn={returnBook} onPaid={markPaid} returningId={returningId} payingId={payingId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function LoanTable({ rows, lib, onReturn, onPaid, returningId, payingId }: { rows: Loan[]; lib: boolean; onReturn: (loan: Loan) => void; onPaid: (loan: Loan) => void; returningId: string | null; payingId: string | null }) {
  if (!rows.length) return <div className="mt-3 rounded-2xl border border-dashed bg-card py-14 text-center"><BookOpenCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No matching transactions</p><p className="mt-1 text-xs text-muted-foreground">Records will appear here as books are issued and returned.</p></div>;
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="hidden overflow-x-auto lg:block"><Table><TableHeader><TableRow><TableHead>Book / transaction</TableHead>{lib && <TableHead>Member</TableHead>}<TableHead>Issued</TableHead><TableHead>Due</TableHead><TableHead>Returned</TableHead><TableHead>Fine</TableHead><TableHead>Status</TableHead>{lib && <TableHead className="text-right">Action</TableHead>}</TableRow></TableHeader><TableBody>{rows.map((loan) => { const fine = loan.returned_at ? Number(loan.fine_amount) : calcFine(loan.due_date); return <TableRow key={loan.id}><TableCell><p className="font-semibold">{loan.books?.title}</p><p className="mt-0.5 text-xs text-muted-foreground">#{loan.id.slice(0, 8)} · {loan.books?.author}</p></TableCell>{lib && <TableCell>{loan.profiles?.full_name}</TableCell>}<TableCell>{new Date(loan.issued_at).toLocaleDateString("en-IN")}</TableCell><TableCell>{loan.due_date}</TableCell><TableCell>{loan.returned_at ? new Date(loan.returned_at).toLocaleDateString("en-IN") : "—"}</TableCell><TableCell className={fine ? "font-semibold text-destructive" : "text-muted-foreground"}>{fine ? rupees(fine) : "—"}</TableCell><TableCell><Badge variant={loan.returned_at ? (fine && !loan.fine_paid ? "destructive" : "secondary") : fine ? "destructive" : "outline"}>{loan.returned_at ? (fine ? (loan.fine_paid ? "Fine paid" : "Fine unpaid") : "Returned") : fine ? "Overdue" : "On loan"}</Badge></TableCell>{lib && <TableCell className="text-right">{!loan.returned_at ? <Button size="sm" disabled={returningId === loan.id} onClick={() => onReturn(loan)}>{returningId === loan.id ? <Loader2 className="animate-spin" /> : <RotateCcw />}Return</Button> : fine > 0 && !loan.fine_paid ? <Button size="sm" variant="outline" disabled={payingId === loan.id} onClick={() => onPaid(loan)}>{payingId === loan.id ? <Loader2 className="animate-spin" /> : <Check />}Mark paid</Button> : null}</TableCell>}</TableRow>; })}</TableBody></Table></div>
      <ul className="divide-y lg:hidden">{rows.map((loan) => { const fine = loan.returned_at ? Number(loan.fine_amount) : calcFine(loan.due_date); return <li key={loan.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{loan.books?.title}</p><p className="mt-1 text-xs text-muted-foreground">{lib ? `${loan.profiles?.full_name} · ` : ""}#{loan.id.slice(0, 8)}</p></div><Badge variant={loan.returned_at ? "secondary" : fine ? "destructive" : "outline"}>{loan.returned_at ? "Returned" : fine ? "Overdue" : "On loan"}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-muted p-3"><p className="text-muted-foreground">Issued</p><p className="mt-1 font-semibold">{new Date(loan.issued_at).toLocaleDateString("en-IN")}</p></div><div className="rounded-xl bg-muted p-3"><p className="text-muted-foreground">Due</p><p className="mt-1 font-semibold">{loan.due_date}</p></div><div className="rounded-xl bg-muted p-3"><p className="text-muted-foreground">Returned</p><p className="mt-1 font-semibold">{loan.returned_at ? new Date(loan.returned_at).toLocaleDateString("en-IN") : "—"}</p></div><div className="rounded-xl bg-muted p-3"><p className="text-muted-foreground">Fine</p><p className={`mt-1 font-semibold ${fine ? "text-destructive" : ""}`}>{fine ? `${rupees(fine)}${loan.returned_at ? ` · ${loan.fine_paid ? "paid" : "unpaid"}` : ""}` : "No fine"}</p></div></div>{lib && (!loan.returned_at || (fine > 0 && !loan.fine_paid)) && <Button className="mt-3 w-full" variant={loan.returned_at ? "outline" : "default"} disabled={returningId === loan.id || payingId === loan.id} onClick={() => loan.returned_at ? onPaid(loan) : onReturn(loan)}>{(returningId === loan.id || payingId === loan.id) && <Loader2 className="animate-spin" />}{loan.returned_at ? "Mark fine paid" : "Return book"}</Button>}</li>; })}</ul>
    </div>
  );
}
