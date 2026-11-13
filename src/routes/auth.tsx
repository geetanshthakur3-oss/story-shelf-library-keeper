import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or register — Shelfwise" },
      { name: "description", content: "Sign in to Shelfwise or register your library member account." },
      { property: "og:title", content: "Sign in or register — Shelfwise" },
      { property: "og:description", content: "Access your library catalog, loans, due dates, and fines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else navigate({ to: "/dashboard", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Check your email to confirm your account.");
      else navigate({ to: "/dashboard", replace: true });
    }
    setBusy(false);
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(String(result.error.message ?? result.error));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-hero p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-dots opacity-25" />
        <Link to="/" className="relative w-fit"><Brand inverse /></Link>
        <div className="relative max-w-xl">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-foreground/10"><BookOpenCheck className="h-6 w-6" /></span>
          <h1 className="mt-8 text-5xl leading-[1.08]">Every reader deserves a well-run library.</h1>
          <p className="mt-5 max-w-md leading-relaxed text-primary-foreground/70">Your catalog, circulation, members, and daily tasks in one calm workspace.</p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/80">
            {["Secure, personal member accounts", "Live due dates and automatic fine tracking", "Clear reports for every librarian"].map((item) => <li key={item} className="flex items-center gap-3"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary-foreground/10"><Check className="h-3 w-3" /></span>{item}</li>)}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/50">Shelfwise · Modern library management</p>
      </section>

      <main className="flex min-h-screen flex-col px-5 py-5 sm:px-8">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/"><ArrowLeft /> Back to home</Link></Button>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-10">
          <div className="w-full">
            <div className="mb-8 lg:hidden"><Brand /></div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{mode === "in" ? "Welcome back" : "Join the library"}</p>
            <h2 className="mt-3 text-4xl">{mode === "in" ? "Sign in to Shelfwise" : "Create your account"}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{mode === "in" ? "Pick up right where your library left off." : "Register as a member to browse books and keep track of your loans."}</p>

            <Button type="button" variant="outline" className="mt-8 h-11 w-full rounded-xl bg-card" onClick={google} disabled={busy}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
              Continue with Google
            </Button>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or continue with email<div className="h-px flex-1 bg-border" /></div>
            <form onSubmit={submit} className="space-y-4">
              {mode === "up" && <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" autoComplete="name" className="h-11 rounded-xl" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" /></div>}
              <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" className="h-11 rounded-xl" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} className="h-11 rounded-xl" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></div>
              <Button type="submit" className="h-11 w-full rounded-xl" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}{mode === "in" ? "Sign in" : "Create member account"}</Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "in" ? "New to Shelfwise?" : "Already registered?"}{" "}
              <button type="button" className="font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Create an account" : "Sign in"}</button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
