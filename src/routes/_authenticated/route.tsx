import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ComponentType } from "react";
import { LayoutDashboard, BookOpen, Users, ArrowLeftRight, LogOut, ChartNoAxesCombined, Menu, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLibraryUser } from "@/hooks/use-library-user";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Notifications } from "@/components/Notifications";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

type NavItem = { to: "/dashboard" | "/books" | "/members" | "/loans" | "/reports"; label: string; icon: ComponentType<{ className?: string }> };

function Navigation({ links, onNavigate }: { links: NavItem[]; onNavigate?: (() => void) | undefined }) {
  return (
    <nav className="mt-8 flex flex-1 flex-col gap-1.5" aria-label="Main navigation">
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/50">Workspace</p>
      {links.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-primary shadow-sm" }}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Layout() {
  const { data: me } = useLibraryUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const links: NavItem[] = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/books", label: "Book catalog", icon: BookOpen },
    ...(me?.isLibrarian ? [{ to: "/members" as const, label: "Members", icon: Users }] : []),
    { to: "/loans", label: me?.isLibrarian ? "Circulation" : "My loans", icon: ArrowLeftRight },
    ...(me?.isLibrarian ? [{ to: "/reports" as const, label: "Reports", icon: ChartNoAxesCombined }] : []),
  ];
  const title = links.find((link) => link.to === pathname)?.label ?? "Library workspace";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = me?.profile?.full_name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SW";
  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col bg-sidebar p-5 text-sidebar-foreground">
      <Link to="/dashboard" onClick={onNavigate} aria-label="Shelfwise dashboard"><Brand inverse /></Link>
      <Navigation links={links} onNavigate={onNavigate} />
      <div className="mt-6 rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
        <p className="text-xs text-sidebar-foreground/60">Signed in as</p>
        <p className="mt-1 truncate text-sm font-semibold">{me?.profile?.full_name || "Library user"}</p>
        <p className="mt-0.5 text-xs text-sidebar-primary">{me?.isLibrarian ? "Librarian" : "Member"}</p>
      </div>
      <button onClick={signOut} className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 md:block">{sidebar()}</aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] border-sidebar-border p-0 [&>button]:text-sidebar-foreground">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar(() => setMobileOpen(false))}
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:block">Shelfwise Library</p>
            <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
          </div>
          <Notifications />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" aria-label="Open account menu">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initials}</span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <p className="truncate">{me?.profile?.full_name || "Library user"}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">{me?.profile?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}><LogOut /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
