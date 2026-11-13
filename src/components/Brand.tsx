import { LibraryBig } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", inverse ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-primary text-primary-foreground")}>
        <LibraryBig className="h-5 w-5" strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className={cn("font-display text-[1.65rem] leading-none tracking-tight", inverse ? "text-sidebar-foreground" : "text-foreground")}>
          Shelfwise
        </span>
      )}
    </span>
  );
}
