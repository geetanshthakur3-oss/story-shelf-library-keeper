import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchBooks, fetchLoans, fetchMembers, type Loan } from "@/lib/queries";
import { calcFine, rupees, FINE_PER_DAY, LOAN_DAYS } from "@/lib/library";
import { useLibraryUser } from "@/hooks/use-library-user";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/loans")({
  head: () => ({ meta: [{ title: "Loans — Shelfwise" }, { name: "description", content: "Issue and return books." }] }),
  component: Loans,
});

function Loans() {
  const { data: me } = useLibraryUser();
  const qc = useQueryClient();
  const lib = !!me?.isLibrarian;
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: fetchLoans });
  const { data: books = [] } = useQuery({ queryKey: ["books"], queryFn: fetchBooks, enabled: lib });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers, enabled: lib });
  const [bookId, setBookId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [days, setDays] = useState(LOAN_DAYS);

  const refresh = () => qc.invalidateQueries();

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    if (!bookId || !memberId) return toast.error("Choose a book and a member");
    const { error } = await supabase.rpc("issue_book", { _book_id: bookId, _member_id: memberId, _days: days });
    if (error) return toast.error(error.message);
    toast.success("Book issued");
    setBookId(""); refresh();
  }
  async function returnBook(l: Loan) {
    const { data, error } = await supabase.rpc("return_book", { _loan_id: l.id, _fine_per_day: FINE_PER_DAY });
    if (error) return toast.error(error.message);
    toast.success(Number(data) > 0 ? `Returned. Late fine: ${rupees(Number(data))}` : "Returned on time — no fine");
    refresh();
  }
  async function markPaid(l: Loan) {
    const { error } = await supabase.from("loans").update({ fine_paid: true }).eq("id", l.id);
    if (error) return toast.error(error.message);
    toast.success("Fine marked as paid"); refresh();
  }

  const active = loans.filter((l) => !l.returned_at);
  const history = loans.filter((l) => l.returned_at);
  const fines = history.filter((l) => Number(l.fine_amount) > 0);

  return (
    <div>
      <PageHeader title={lib ? "Issue & return" : "My loans"} subtitle={`Loans last ${LOAN_DAYS} days by default · late fine ${rupees(FINE_PER_DAY)} per day`} />
      {lib && (
        <form onSubmit={issue} className="rounded-lg border bg-card p-5 shadow-card grid gap-4 md:grid-cols-[1fr_1fr_120px_auto] items-end mb-10">
          <div className="space-y-1.5"><Label>Book</Label>
            <Select value={bookId} onValueChange={setBookId}><SelectTrigger><SelectValue placeholder="Choose a book" /></SelectTrigger>
              <SelectContent>{books.map((b) => <SelectItem key={b.id} value={b.id} disabled={b.available_copies < 1}>{b.title} ({b.available_copies} left)</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label>Member</Label>
            <Select value={memberId} onValueChange={setMemberId}><SelectTrigger><SelectValue placeholder="Choose a member" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name} · {m.email}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label>Days</Label><Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
          <Button type="submit">Issue book</Button>
        </form>
      )}
      <Tabs defaultValue="active">
        <TabsList><TabsTrigger value="active">On loan ({active.length})</TabsTrigger><TabsTrigger value="fines">Fines ({fines.length})</TabsTrigger><TabsTrigger value="history">History ({history.length})</TabsTrigger></TabsList>
        <TabsContent value="active"><LoanTable rows={active} lib={lib} kind="active" onReturn={returnBook} onPaid={markPaid} /></TabsContent>
        <TabsContent value="fines"><LoanTable rows={fines} lib={lib} kind="fines" onReturn={returnBook} onPaid={markPaid} /></TabsContent>
        <TabsContent value="history"><LoanTable rows={history} lib={lib} kind="history" onReturn={returnBook} onPaid={markPaid} /></TabsContent>
      </Tabs>
    </div>
  );
}

function LoanTable({ rows, lib, kind, onReturn, onPaid }: { rows: Loan[]; lib: boolean; kind: "active" | "fines" | "history"; onReturn: (l: Loan) => void; onPaid: (l: Loan) => void }) {
  if (!rows.length) return <p className="text-muted-foreground py-6">Nothing here yet.</p>;
  return (
    <div className="rounded-lg border bg-card shadow-card overflow-x-auto mt-2">
      <Table>
        <TableHeader><TableRow><TableHead>Book</TableHead>{lib && <TableHead>Member</TableHead>}<TableHead>Issued</TableHead><TableHead>Due</TableHead>{kind !== "active" && <TableHead>Returned</TableHead>}<TableHead>Fine</TableHead>{lib && <TableHead />}</TableRow></TableHeader>
        <TableBody>
          {rows.map((l) => {
            const live = kind === "active" ? calcFine(l.due_date) : Number(l.fine_amount);
            return (
              <TableRow key={l.id}>
                <TableCell><p className="font-medium">{l.books?.title}</p><p className="text-xs text-muted-foreground">{l.books?.author}</p></TableCell>
                {lib && <TableCell>{l.profiles?.full_name}</TableCell>}
                <TableCell>{new Date(l.issued_at).toLocaleDateString("en-IN")}</TableCell>
                <TableCell>{l.due_date}</TableCell>
                {kind !== "active" && <TableCell>{l.returned_at && new Date(l.returned_at).toLocaleDateString("en-IN")}</TableCell>}
                <TableCell>
                  {live > 0 ? (
                    <span className="flex items-center gap-2"><span className="text-destructive font-semibold">{rupees(live)}</span>
                      {kind !== "active" && <Badge variant={l.fine_paid ? "secondary" : "destructive"}>{l.fine_paid ? "Paid" : "Unpaid"}</Badge>}
                      {kind === "active" && <Badge variant="destructive">Overdue</Badge>}</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                {lib && <TableCell className="text-right">
                  {kind === "active" && <Button size="sm" onClick={() => onReturn(l)}>Return</Button>}
                  {kind !== "active" && live > 0 && !l.fine_paid && <Button size="sm" variant="outline" onClick={() => onPaid(l)}>Mark paid</Button>}
                </TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
