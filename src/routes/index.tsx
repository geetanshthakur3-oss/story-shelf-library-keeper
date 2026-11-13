import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Users, ArrowLeftRight, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shelfwise — Library Management System" },
      { name: "description", content: "Manage your library's books, members, issues, returns and late fines in one place." },
      { property: "og:title", content: "Shelfwise — Library Management System" },
      { property: "og:description", content: "Manage books, members, issues, returns and late fines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: BookOpen, title: "Book catalog", text: "Search titles, authors and track copies on the shelf." },
  { icon: Users, title: "Members", text: "Every reader gets an account to see their own loans." },
  { icon: ArrowLeftRight, title: "Issue & return", text: "Lend books in seconds with automatic due dates." },
  { icon: IndianRupee, title: "Late fines", text: "Overdue fines calculated automatically, per day." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
          <span className="font-display text-2xl font-bold">Shelfwise</span>
          <Button asChild variant="secondary"><Link to="/auth">Sign in</Link></Button>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-16">
          <p className="text-accent font-medium tracking-widest uppercase text-sm">Library management</p>
          <h1 className="mt-4 text-5xl md:text-7xl font-bold max-w-3xl leading-[1.05]">Every book, every reader, always accounted for.</h1>
          <p className="mt-6 max-w-xl text-lg opacity-80">Run your library's catalog, memberships, lending and fines from one calm, simple workspace.</p>
          <Button asChild size="lg" className="mt-10 bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/auth">Get started</Link></Button>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg bg-card p-6 shadow-card border">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
