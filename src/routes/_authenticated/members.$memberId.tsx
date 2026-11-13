import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, Clock3, IndianRupee, LibraryBig, Mail } from "lucide-react";
import { fetchLoans, fetchMembers } from "@/lib/queries";
import { calcFine, rupees } from "@/lib/library";
import { useLibraryUser } from "@/hooks/use-library-user";
import { LoadingState, ErrorState } from "@/components/AsyncState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/members/$memberId")({
  head: () => ({
    meta: [
      { title: "Member profile — Shelfwise" },
      { name: "description", content: "Member details, current loans, fines, and complete borrowing history." },
      { property: "og:title", content: "Member profile — Shelfwise" },
      { property: "og:description", content: "A member's library activity and transaction history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemberProfile,
});

function MemberProfile() {
  const { memberId } = Route.useParams();
  const { data: me, isLoading: meLoading } = useLibraryUser();
  const membersQuery = useQuery({ queryKey: ["members"], queryFn: fetchMembers, enabled: !!me?.isLibrarian });
  const loansQuery = useQuery({ queryKey: ["loans"], queryFn: fetchLoans, enabled: !!me?.isLibrarian });

  if (meLoading || membersQuery.isLoading || loansQuery.isLoading) return <LoadingState label="Loading member profile…" cards={4} />;
  if (me && !me.isLibrarian) return <div className="rounded-2xl border bg-card p-8 text-muted-foreground">Only librarians can view member profiles.</div>;
  const error = membersQuery.error ?? loansQuery.error;
  if (error) return <ErrorState error={error} onRetry={() => { membersQuery.refetch(); loansQuery.refetch(); }} />;
  const member = membersQuery.data?.find((item) => item.id === memberId);
  if (!member) return <div className="rounded-2xl border bg-card p-8"><h1 className="text-2xl">Member not found</h1><p className="mt-2 text-sm text-muted-foreground">This account may no longer be available.</p><Button asChild className="mt-5"><Link to="/members">Back to members</Link></Button></div>;

  const history = (loansQuery.data ?? []).filter((loan) => loan.member_id === memberId);
  const active = history.filter((loan) => !loan.returned_at);
  const overdue = active.filter((loan) => calcFine(loan.due_date) > 0);
  const unpaid = history.reduce((sum, loan) => sum + (loan.returned_at ? (!loan.fine_paid ? Number(loan.fine_amount) : 0) : calcFine(loan.due_date)), 0);
  const initials = member.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2"><Link to="/members"><ArrowLeft />Back to members</Link></Button>
      <section className="rounded-2xl border bg-card p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-primary text-2xl font-extrabold text-primary-foreground">{initials}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-widest text-primary">Member profile</p><h1 className="mt-1 text-3xl sm:text-4xl">{member.full_name}</h1><p className="mt-2 flex items-center gap-2 break-all text-sm text-muted-foreground"><Mail className="h-4 w-4 shrink-0" />{member.email || "No email recorded"}</p></div><Badge variant="secondary" className="w-fit">Joined {new Date(member.created_at).toLocaleDateString("en-IN")}</Badge></div>
      </section>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Current books", value: active.length, icon: BookOpenCheck }, { label: "Overdue books", value: overdue.length, icon: Clock3, urgent: overdue.length > 0 }, { label: "Total borrowed", value: history.length, icon: LibraryBig }, { label: "Fines due", value: rupees(unpaid), icon: IndianRupee, urgent: unpaid > 0 }].map((stat) => <article key={stat.label} className="rounded-2xl border bg-card p-5 shadow-card"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{stat.label}</p><stat.icon className={`h-5 w-5 ${stat.urgent ? "text-destructive" : "text-primary"}`} /></div><p className={`mt-3 text-2xl font-extrabold ${stat.urgent ? "text-destructive" : ""}`}>{stat.value}</p></article>)}
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-card"><div className="border-b p-5 sm:px-6"><h2 className="font-sans text-lg font-bold">Borrowing history & transactions</h2><p className="mt-1 text-xs text-muted-foreground">Every issue, return, due date, and fine for this member</p></div>{history.length === 0 ? <div className="p-10 text-center"><BookOpenCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No borrowing history yet</p></div> : <ul className="divide-y">{history.map((loan) => { const liveFine = loan.returned_at ? Number(loan.fine_amount) : calcFine(loan.due_date); return <li key={loan.id} className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{loan.books?.title}</p><Badge variant={loan.returned_at ? "secondary" : liveFine > 0 ? "destructive" : "outline"}>{loan.returned_at ? "Returned" : liveFine > 0 ? "Overdue" : "On loan"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{loan.books?.author}</p><div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3"><span>Issued: {new Date(loan.issued_at).toLocaleDateString("en-IN")}</span><span>Due: {loan.due_date}</span><span>Returned: {loan.returned_at ? new Date(loan.returned_at).toLocaleDateString("en-IN") : "—"}</span></div></div><div className="text-sm sm:text-right"><p className={liveFine ? "font-bold text-destructive" : "text-muted-foreground"}>{liveFine ? rupees(liveFine) : "No fine"}</p>{liveFine > 0 && <p className="mt-1 text-xs text-muted-foreground">{loan.returned_at ? (loan.fine_paid ? "Paid" : "Unpaid") : "Accruing"}</p>}</div></li>; })}</ul>}</section>
    </div>
  );
}
