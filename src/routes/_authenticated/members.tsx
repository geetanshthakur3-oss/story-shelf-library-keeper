import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, UserPlus, Users, BookOpenCheck, IndianRupee, Eye } from "lucide-react";
import { fetchLoans, fetchMembers } from "@/lib/queries";
import { calcFine, rupees } from "@/lib/library";
import { useLibraryUser } from "@/hooks/use-library-user";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState } from "@/components/AsyncState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({
    meta: [
      { title: "Library members — Shelfwise" },
      { name: "description", content: "Search registered members, invite readers, and open member profiles." },
      { property: "og:title", content: "Library members — Shelfwise" },
      { property: "og:description", content: "Manage library members and their borrowing activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Members,
});

function Members() {
  const { data: me, isLoading: meLoading } = useLibraryUser();
  const membersQuery = useQuery({ queryKey: ["members"], queryFn: fetchMembers, enabled: !!me?.isLibrarian });
  const loansQuery = useQuery({ queryKey: ["loans"], queryFn: fetchLoans, enabled: !!me?.isLibrarian });
  const [q, setQ] = useState("");
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const loans = useMemo(() => loansQuery.data ?? [], [loansQuery.data]);
  const filtered = members.filter((member) => `${member.full_name} ${member.email ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  const activeLoans = loans.filter((loan) => !loan.returned_at);
  const totalFines = loans.reduce((sum, loan) => sum + (loan.returned_at ? (!loan.fine_paid ? Number(loan.fine_amount) : 0) : calcFine(loan.due_date)), 0);

  async function copyRegistrationLink() {
    const link = `${window.location.origin}/auth`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Registration link copied", { description: "Share it with a new member so they can create their account." });
    } catch {
      toast.error("Couldn't copy automatically", { description: link });
    }
  }

  if (meLoading) return <LoadingState label="Loading member accounts…" cards={3} />;
  if (me && !me.isLibrarian) return <div className="rounded-2xl border bg-card p-8 text-muted-foreground">Only librarians can view member accounts.</div>;
  const error = membersQuery.error ?? loansQuery.error;

  return (
    <div>
      <PageHeader title="Members" subtitle="Registered readers, live borrowing activity, and complete member profiles." action={<Button onClick={copyRegistrationLink} className="rounded-xl"><UserPlus />Invite member</Button>} />
      {membersQuery.isLoading || loansQuery.isLoading ? <LoadingState label="Loading members and borrowing activity…" cards={3} /> : error ? <ErrorState error={error} onRetry={() => { membersQuery.refetch(); loansQuery.refetch(); }} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[{ label: "Registered members", value: members.length, note: "Live account registrations", icon: Users }, { label: "Active borrowers", value: new Set(activeLoans.map((loan) => loan.member_id)).size, note: `${activeLoans.length} books currently out`, icon: BookOpenCheck }, { label: "Outstanding fines", value: rupees(totalFines), note: "Across all member accounts", icon: IndianRupee }].map((stat) => <article key={stat.label} className="rounded-2xl border bg-card p-5 shadow-card"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{stat.label}</p><stat.icon className="h-5 w-5 text-primary" /></div><p className="mt-3 text-2xl font-extrabold">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.note}</p></article>)}
          </div>
          <div className="relative my-6 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-10 bg-card pl-9" placeholder="Search name or email" value={q} onChange={(event) => setQ(event.target.value)} /></div>
          {filtered.length === 0 ? <div className="rounded-2xl border border-dashed bg-card py-16 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-semibold">No members found</p><p className="mt-1 text-sm text-muted-foreground">Try a different name or email.</p></div> : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-card md:block"><Table><TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Books out</TableHead><TableHead className="text-right">Fines due</TableHead><TableHead className="text-right">Profile</TableHead></TableRow></TableHeader><TableBody>{filtered.map((member) => { const mine = loans.filter((loan) => loan.member_id === member.id); const out = mine.filter((loan) => !loan.returned_at); const due = mine.filter((loan) => loan.returned_at && !loan.fine_paid).reduce((sum, loan) => sum + Number(loan.fine_amount), 0) + out.reduce((sum, loan) => sum + calcFine(loan.due_date), 0); return <TableRow key={member.id}><TableCell><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-bold text-primary">{member.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><p className="font-semibold">{member.full_name}{member.id === me?.user.id && " (you)"}</p><p className="text-xs text-muted-foreground">{member.email}</p></div></div></TableCell><TableCell>{new Date(member.created_at).toLocaleDateString("en-IN")}</TableCell><TableCell className="text-right">{out.length}</TableCell><TableCell className={`text-right ${due ? "font-semibold text-destructive" : ""}`}>{rupees(due)}</TableCell><TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link to="/members/$memberId" params={{ memberId: member.id }}><Eye />View</Link></Button></TableCell></TableRow>; })}</TableBody></Table></div>
              <div className="space-y-3 md:hidden">{filtered.map((member) => { const mine = loans.filter((loan) => loan.member_id === member.id); const out = mine.filter((loan) => !loan.returned_at); const due = out.reduce((sum, loan) => sum + calcFine(loan.due_date), 0) + mine.filter((loan) => loan.returned_at && !loan.fine_paid).reduce((sum, loan) => sum + Number(loan.fine_amount), 0); return <article key={member.id} className="rounded-2xl border bg-card p-4 shadow-card"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-primary">{member.full_name.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{member.full_name}</p><p className="truncate text-xs text-muted-foreground">{member.email}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Books out</p><p className="mt-1 font-bold">{out.length}</p></div><div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Fines due</p><p className={`mt-1 font-bold ${due ? "text-destructive" : ""}`}>{rupees(due)}</p></div></div><Button asChild variant="outline" className="mt-3 w-full"><Link to="/members/$memberId" params={{ memberId: member.id }}><Eye />View member profile</Link></Button></article>; })}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
