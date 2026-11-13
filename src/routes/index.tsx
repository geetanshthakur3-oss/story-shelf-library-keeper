import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Users, ArrowLeftRight, IndianRupee, ArrowRight, Check, BarChart3, BellRing, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shelfwise — Modern Library Management" },
      { name: "description", content: "A calm, modern workspace for your library catalog, members, circulation, fines, and reports." },
      { property: "og:title", content: "Shelfwise — Modern Library Management" },
      { property: "og:description", content: "Manage books, members, lending, late fines, and library reports in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: BookOpen, title: "Smart catalog", text: "Find any title instantly, manage copies, and see live shelf availability." },
  { icon: Users, title: "Member management", text: "Give every reader an account and a clear view of their borrowing activity." },
  { icon: ArrowLeftRight, title: "Effortless circulation", text: "Issue and return books in seconds while copy counts stay accurate." },
  { icon: IndianRupee, title: "Automatic fines", text: "Late fees calculate themselves at ₹5 per overdue day—no spreadsheets needed." },
  { icon: BarChart3, title: "Reports that make sense", text: "Follow circulation trends, collection mix, and fines with exportable reports." },
  { icon: BellRing, title: "Timely reminders", text: "Keep due dates, overdue books, unpaid fines, and stock alerts in one place." },
];

function Index() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);
  const destination = signedIn ? "/dashboard" : "/auth";

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <section className="bg-hero text-primary-foreground">
        <header className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" aria-label="Shelfwise home"><Brand inverse /></Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-primary-foreground/75 lg:flex" aria-label="Homepage navigation">
            <a href="#features" className="transition-colors hover:text-primary-foreground">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-primary-foreground">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Link to={destination}>{signedIn ? "Open dashboard" : "Sign in"}<ArrowRight /></Link>
            </Button>
          </div>
        </header>

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pb-28 lg:pt-20">
          <div className="absolute inset-0 bg-dots opacity-30" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold tracking-wide">
              <Sparkles className="h-3.5 w-3.5" /> Your entire library, beautifully organised
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl leading-[1.04] sm:text-6xl lg:text-7xl">A smarter home for every story.</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/75 sm:text-lg">
              Catalog your collection, welcome members, and manage every loan from one focused workspace built for modern libraries.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-xl bg-primary-foreground px-6 text-primary hover:bg-primary-foreground/90">
                <Link to={destination}>{signedIn ? "Go to your library" : "Get started free"}<ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-12 rounded-xl border border-primary-foreground/25 px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <a href="#features">Explore features</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-primary-foreground/65">
              {['14-day lending by default', 'Secure member accounts', 'Works on every device'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-sidebar-primary" />{item}</span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:mx-0">
            <div className="absolute -inset-8 rounded-full bg-primary-foreground/5 blur-2xl" />
            <div className="relative rounded-3xl border border-primary-foreground/15 bg-card p-5 text-card-foreground shadow-float sm:p-6">
              <div className="flex items-center justify-between border-b pb-5">
                <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Library overview</p><p className="mt-1 text-lg font-bold">Good morning, Librarian</p></div>
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">LIVE</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[["Catalog", BookOpen], ["Circulation", ArrowLeftRight], ["Members", Users]].map(([label, Icon]) => {
                  const IconComponent = Icon as typeof BookOpen;
                  return <div key={label as string} className="rounded-2xl bg-muted p-3.5"><IconComponent className="h-4 w-4 text-primary" /><p className="mt-3 text-xs font-semibold">{label as string}</p><p className="mt-0.5 text-[10px] text-muted-foreground">Up to date</p></div>;
                })}
              </div>
              <div className="mt-5 rounded-2xl border p-4">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold">Circulation activity</p><span className="text-[10px] text-muted-foreground">Last 6 months</span></div>
                <div className="mt-5 flex h-28 items-end gap-2.5">
                  {[42, 64, 52, 82, 68, 92, 74, 100, 82, 94, 72, 88].map((height, index) => <span key={index} className="flex-1 rounded-t-md bg-chart-1/75" style={{ height: `${height}%`, opacity: 0.35 + index / 20 }} />)}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-accent p-3.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><BellRing className="h-4 w-4" /></span>
                <div><p className="text-xs font-semibold">Everything that needs attention</p><p className="mt-0.5 text-[10px] text-muted-foreground">Due dates, fines, and availability in one view</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Everything in its place</p>
          <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">Less administration. More reading.</h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">Purpose-built tools remove the repetitive work, so you can focus on your readers and your collection.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="group rounded-2xl border bg-card p-6 shadow-card transition-transform hover:-translate-y-1">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><feature.icon className="h-5 w-5" /></span>
              <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-8 border-y bg-muted/60">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:py-24">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Simple by design</p><h2 className="mt-4 text-4xl leading-tight sm:text-5xl">From shelf to reader, without the busywork.</h2></div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[{ n: "01", title: "Build your catalog", text: "Add books and copies, then find them instantly with powerful search." }, { n: "02", title: "Welcome readers", text: "Members register securely and see their own loans and due dates." }, { n: "03", title: "Keep books moving", text: "Issue, return, and track fines while reports update automatically." }].map((step) => (
              <div key={step.n} className="border-t-2 border-primary pt-5"><span className="text-xs font-bold text-primary">{step.n}</span><h3 className="mt-4 font-bold">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-hero px-6 py-12 text-primary-foreground shadow-float sm:px-12 lg:flex lg:items-center lg:justify-between">
          <div className="absolute inset-0 bg-dots opacity-20" />
          <div className="relative max-w-2xl"><h2 className="text-3xl sm:text-4xl">Ready to put your library in order?</h2><p className="mt-3 text-primary-foreground/70">Your books, readers, and daily work—together at last.</p></div>
          <Button asChild size="lg" className="relative mt-7 h-12 rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90 lg:mt-0"><Link to={destination}>{signedIn ? "Open Shelfwise" : "Create your account"}<ArrowRight /></Link></Button>
        </div>
      </section>
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8"><Brand /><p>Thoughtful tools for libraries and the people who love them.</p><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Secure by design</span></div>
      </footer>
    </div>
  );
}
