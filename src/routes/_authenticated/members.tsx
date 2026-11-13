import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchLoans, fetchMembers } from "@/lib/queries";
import { calcFine, rupees } from "@/lib/library";
import { useLibraryUser } from "@/hooks/use-library-user";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Members — Shelfwise" }, { name: "description", content: "Library members." }] }),
  component: Members,
});

function Members() {
  const { data: me } = useLibraryUser();
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers, enabled: !!me?.isLibrarian });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: fetchLoans });
  if (me && !me.isLibrarian) return <p className="text-muted-foreground">Only librarians can view members.</p>;

  return (
    <div>
      <PageHeader title="Members" subtitle="New members join by creating an account on the sign-in page." />
      <div className="rounded-lg border bg-card shadow-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Books out</TableHead><TableHead className="text-right">Fines due</TableHead></TableRow></TableHeader>
          <TableBody>
            {members.map((m) => {
              const mine = loans.filter((l) => l.member_id === m.id);
              const out = mine.filter((l) => !l.returned_at);
              const due = mine.filter((l) => l.returned_at && !l.fine_paid).reduce((s, l) => s + Number(l.fine_amount), 0) + out.reduce((s, l) => s + calcFine(l.due_date), 0);
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.full_name}{m.id === me?.user.id && " (you)"}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{new Date(m.created_at).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell className="text-right">{out.length}</TableCell>
                  <TableCell className={`text-right ${due ? "text-destructive font-semibold" : ""}`}>{rupees(due)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
