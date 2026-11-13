import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, BookOpen, Users, ArrowLeftRight, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLibraryUser } from "@/hooks/use-library-user";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

function Layout() {
  const { data: me } = useLibraryUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/books", label: "Books", icon: BookOpen },
    ...(me?.isLibrarian ? [{ to: "/members", label: "Members", icon: Users }] : []),
    { to: "/loans", label: me?.isLibrarian ? "Issue & return" : "My loans", icon: ArrowLeftRight },
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-sidebar text-sidebar-foreground md:w-60 md:min-h-screen flex md:flex-col p-4 gap-2 overflow-x-auto">
        <Link to="/dashboard" className="font-display text-2xl font-bold px-3 py-2 text-sidebar-primary hidden md:block">Shelfwise</Link>
        <nav className="flex md:flex-col gap-1 md:mt-6 flex-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-primary font-semibold" }}>
              <l.icon className="h-4 w-4" />{l.label}
            </Link>
          ))}
        </nav>
        <div className="md:border-t border-sidebar-border md:pt-4 flex md:flex-col gap-2">
          <div className="px-3 hidden md:block">
            <p className="text-sm font-semibold truncate">{me?.profile?.full_name}</p>
            <p className="text-xs opacity-70">{me?.isLibrarian ? "Librarian" : "Member"}</p>
          </div>
          <button onClick={signOut} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent whitespace-nowrap"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10 max-w-6xl"><Outlet /></main>
    </div>
  );
}
