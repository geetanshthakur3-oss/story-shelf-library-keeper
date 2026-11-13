import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ComponentType } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ArrowRight, ArrowUpRight, BookCopy, BookOpenCheck, Clock3, IndianRupee, Plus, RotateCcw, Users } from "lucide-react";
import { useLibraryUser } from "@/hooks/use-library-user";
import { fetchBooks, fetchLoans } from "@/lib/queries";
import { calcFine, rupees } from "@/lib/library";
import { buildMonthlyActivity } from "@/lib/reports";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Library overview — Shelfwise" },
      { name: "description", content: "Live library metrics, circulation charts, overdue books, and recent activity." },
      { property: "og:title", content: "Library overview — Shelfwise" },
      { property: "og:description", content: "Your library's daily work at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Stat({ label, value, note, icon: Icon, urgent = false }: { label: string; value: string | number; note: string; icon: ComponentType<{ className?: string }>; urgent?: boolean }) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-xl ${urgent ? "bg-destructive/10 text-destructive" : "bg-accent text-primary"}`}><Icon className="h-[18px] w-[18px]" /></span></div>
      <p className={`mt-1 text-3xl font-extrabold tracking-tight ${urgent ? "text-destructive" : ""}`}>{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>
    </article>
  );
}

function Dashboard() {
  const { data: me } = useLibraryUser();
  const booksQuery = useQuery({ queryKey: ["books"], queryFn: fetchBooks });
  const loansQuery = useQuery({ queryKey: ["loans"], queryFn: fetchLoans });
  const all = useMemo(() => loansQuery.data ?? [], [loansQuery.data]);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const active = all.filter((loan) => !loan.returned_at);
  const overdue = active.filter((loan) => calcFine(loan.due_date) > 0);
  const unpaid = all.filter((loan) => loan.returned_at && !loan.fine_paid).reduce((sum, loan) => sum + Number(loan.fine_amount), 0) + overdue.reduce((sum, loan) => sum + calcFine(loan.due_date), 0);
  const totalCopies = books.reduce((sum, book) => sum + book.total_copies, 0);
  const availableCopies = books.reduce((sum, book) => sum + book.available_copies, 0);
  const monthly = useMemo(() => buildMonthlyActivity(all, 6), [all]);
  const availability = [{ name: "Available", value: availableCopies }, { name: "On loan", value: totalCopies - availableCopies }];
  const firstName = me?.profile?.full_name?.trim().split(" ")[0] || "there";
  const isLibrarian = !!me?.isLibrarian;

  return (
    <div>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        subtitle={isLibrarian ? "Here's what is happening across your library today." : "Your books, due dates, and reading activity in one place."}
        action={<Button asChild className="rounded-xl"><Link to={isLibrarian ? "/loans" : "/books"}>{isLibrarian ? <Plus /> : <BookOpenCheck />}{isLibrarian ? "Issue a book" : "Browse books"}</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLibrarian ? (
          <>
            <Stat label="Collection" value={books.length} note={`${totalCopies} copies across the catalog`} icon={BookCopy} />
            <Stat label="Books on loan" value={active.length} note={`${availableCopies} copies currently available`} icon={BookOpenCheck} />
            <Stat label="Overdue loans" value={overdue.length} note={overdue.length ? "Returns need your attention" : "Everything is on schedule"} icon={Clock3} urgent={overdue.length > 0} />
            <Stat label="Outstanding fines" value={rupees(unpaid)} note="Live overdue and unpaid balances" icon={IndianRupee} urgent={unpaid > 0} />
          </>
        ) : (
          <>
            <Stat label="Books with me" value={active.length} note="Your current borrowed books" icon={BookOpenCheck} />
            <Stat label="Overdue" value={overdue.length} note={overdue.length ? "Please return these soon" : "Nothing overdue"} icon={Clock3} urgent={overdue.length > 0} />
            <Stat label="Outstanding fines" value={rupees(unpaid)} note="Including live overdue fines" icon={IndianRupee} urgent={unpaid > 0} />
            <Stat label="Books to explore" value={availableCopies} note={`${books.length} titles in the catalog`} icon={BookCopy} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-sans text-lg font-bold">Circulation activity</h2><p className="mt-1 text-xs text-muted-foreground">Issues and returns over the last six months</p></div><Button asChild variant="ghost" size="sm"><Link to="/loans">View loans<ArrowUpRight /></Link></Button></div>
          <ChartContainer config={{ issued: { label: "Issued", color: "var(--chart-1)" }, returned: { label: "Returned", color: "var(--chart-2)" } }} className="mt-6 h-[270px] w-full aspect-auto">
            <AreaChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="issued" stroke="var(--color-issued)" fill="var(--color-issued)" fillOpacity={0.14} strokeWidth={2.5} />
              <Area type="monotone" dataKey="returned" stroke="var(--color-returned)" fill="var(--color-returned)" fillOpacity={0.1} strokeWidth={2.5} />
            </AreaChart>
          </ChartContainer>
          <div className="flex gap-5 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-chart-1" />Issued</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-chart-2" />Returned</span></div>
        </section>

        <section className="min-w-0 rounded-2xl border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-sans text-lg font-bold">{isLibrarian ? "Collection availability" : "Library availability"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Live copies, updated with every loan</p>
          <div className="relative">
            <ChartContainer config={{ available: { label: "Available", color: "var(--chart-2)" }, loaned: { label: "On loan", color: "var(--chart-1)" } }} className="mx-auto mt-3 h-[210px] w-full aspect-auto">
              <PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} /><Pie data={availability} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={4} strokeWidth={0}><Cell fill="var(--color-available)" /><Cell fill="var(--color-loaned)" /></Pie></PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-3xl font-extrabold">{totalCopies}</p><p className="text-[11px] text-muted-foreground">total copies</p></div></div>
          </div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Available</p><p className="mt-1 text-xl font-bold">{availableCopies}</p></div><div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">On loan</p><p className="mt-1 text-xl font-bold">{totalCopies - availableCopies}</p></div></div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <div className="flex items-center justify-between border-b p-5 sm:px-6"><div><h2 className="font-sans text-lg font-bold">Recent activity</h2><p className="mt-1 text-xs text-muted-foreground">Your latest circulation records</p></div><Button asChild variant="ghost" size="sm"><Link to="/loans">View all<ArrowRight /></Link></Button></div>
          {all.length === 0 ? <div className="p-10 text-center"><BookOpenCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No loans yet</p><p className="mt-1 text-xs text-muted-foreground">Your circulation activity will appear here.</p></div> : (
            <ul className="divide-y">
              {all.slice(0, 5).map((loan) => <li key={loan.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-primary">{loan.returned_at ? <RotateCcw className="h-4 w-4" /> : <BookOpenCheck className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{loan.books?.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{isLibrarian ? `${loan.profiles?.full_name} · ` : ""}{loan.returned_at ? "Returned" : `Due ${loan.due_date}`}</p></div><Badge variant={loan.returned_at ? "secondary" : calcFine(loan.due_date) > 0 ? "destructive" : "outline"}>{loan.returned_at ? "Returned" : calcFine(loan.due_date) > 0 ? "Overdue" : "On loan"}</Badge></li>)}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-sans text-lg font-bold">{isLibrarian ? "Quick actions" : "Reading shortcuts"}</h2><p className="mt-1 text-xs text-muted-foreground">Jump straight to a common task</p>
          <div className="mt-5 space-y-2.5">
            {(isLibrarian ? [{ to: "/books" as const, label: "Manage book catalog", icon: BookCopy }, { to: "/members" as const, label: "View library members", icon: Users }, { to: "/loans" as const, label: "Issue or return a book", icon: ArrowRight }] : [{ to: "/books" as const, label: "Find your next book", icon: BookCopy }, { to: "/loans" as const, label: "Check my due dates", icon: Clock3 }]).map((action) => <Link key={action.to} to={action.to} className="flex items-center gap-3 rounded-xl border p-3.5 text-sm font-semibold transition-colors hover:bg-accent"><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-primary"><action.icon className="h-4 w-4" /></span>{action.label}<ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" /></Link>)}
          </div>
        </section>
      </div>
    </div>
  );
}
