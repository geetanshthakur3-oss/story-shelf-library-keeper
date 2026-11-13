import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useLibraryUser } from "@/hooks/use-library-user";
import { fetchBooks, fetchLoans } from "@/lib/queries";
import { calcFine, rupees } from "@/lib/library";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Shelfwise" }, { name: "description", content: "Library overview." }] }),
  component: Dashboard,
});

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function Dashboard() {
  const { data: me } = useLibraryUser();
  const books = useQuery({ queryKey: ["books"], queryFn: fetchBooks });
  const loans = useQuery({ queryKey: ["loans"], queryFn: fetchLoans });
  const all = loans.data ?? [];
  const active = all.filter((l) => !l.returned_at);
  const overdue = active.filter((l) => calcFine(l.due_date) > 0);
  const unpaid =
    all.filter((l) => l.returned_at && !l.fine_paid).reduce((s, l) => s + Number(l.fine_amount), 0) +
    overdue.reduce((s, l) => s + calcFine(l.due_date), 0);
  const totalCopies = (books.data ?? []).reduce((s, b) => s + b.total_copies, 0);

  return (
    <div>
      <PageHeader title={`Hello, ${me?.profile?.full_name?.split(" ")[0] ?? ""}`} subtitle={me?.isLibrarian ? "Here's how the library is doing today." : "Your reading at a glance."} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {me?.isLibrarian && <Stat label="Book titles / copies" value={`${books.data?.length ?? 0} / ${totalCopies}`} />}
        <Stat label={me?.isLibrarian ? "Books on loan" : "Books with me"} value={active.length} />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "text-destructive" : ""} />
        <Stat label="Unpaid fines" value={rupees(unpaid)} tone={unpaid ? "text-destructive" : ""} />
      </div>
      <h2 className="text-2xl font-semibold mt-12 mb-4">Overdue books</h2>
      {overdue.length === 0 ? (
        <p className="text-muted-foreground">Nothing overdue. 🎉</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {overdue.map((l) => (
            <li key={l.id} className="flex justify-between p-4 gap-4">
              <div><p className="font-medium">{l.books?.title}</p><p className="text-sm text-muted-foreground">{l.profiles?.full_name} · due {l.due_date}</p></div>
              <span className="text-destructive font-semibold">{rupees(calcFine(l.due_date))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
