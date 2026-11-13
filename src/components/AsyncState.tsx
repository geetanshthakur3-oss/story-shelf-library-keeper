import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ label = "Loading your library…", cards = 4 }: { label?: string; cards?: number }) {
  return (
    <div role="status" aria-live="polite">
      <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{label}</div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
      </div>
      <Skeleton className="mt-6 h-72 rounded-2xl" />
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong while loading this page.";
  return (
    <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 sm:p-8">
      <AlertCircle className="h-7 w-7 text-destructive" />
      <h2 className="mt-4 font-sans text-lg font-bold">We couldn't load this information</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-5" onClick={onRetry}><RefreshCw />Try again</Button>
    </div>
  );
}
