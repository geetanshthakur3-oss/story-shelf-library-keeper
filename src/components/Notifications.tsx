import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { useLibraryUser } from "@/hooks/use-library-user";
import { fetchBooks, fetchLoans } from "@/lib/queries";
import { buildNotifications } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function Notifications() {
  const { data: me } = useLibraryUser();
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: fetchLoans, enabled: !!me });
  const { data: books = [] } = useQuery({ queryKey: ["books"], queryFn: fetchBooks, enabled: !!me?.isLibrarian });
  const [read, setRead] = useState<string[]>([]);
  const storageKey = me ? `shelfwise-read-notifications:${me.user.id}` : null;
  const items = useMemo(() => buildNotifications(loans, !!me?.isLibrarian, books), [loans, me?.isLibrarian, books]);
  const unread = items.filter((item) => !read.includes(item.id));

  useEffect(() => {
    if (!storageKey) return;
    try {
      setRead(JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[]);
    } catch {
      setRead([]);
    }
  }, [storageKey]);

  function saveRead(ids: string[]) {
    setRead(ids);
    if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify(ids));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}>
          {unread.length ? <BellRing className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-md p-0 sm:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">Due dates, fines, and availability</p>
          </div>
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => saveRead(items.map((item) => item.id))}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">You're all caught up</p>
              <p className="mt-1 text-xs text-muted-foreground">New reminders will appear here.</p>
            </div>
          ) : (
            items.map((item) => (
              <DropdownMenuItem key={item.id} asChild onSelect={() => saveRead([...new Set([...read, item.id])])}>
                <Link to={item.href} className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.tone === "urgent" ? "bg-destructive" : item.tone === "reminder" ? "bg-warning" : "bg-chart-2")} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm leading-snug", !read.includes(item.id) && "font-semibold")}>{item.title}</span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">{item.description}</span>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
