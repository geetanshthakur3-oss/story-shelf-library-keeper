import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, BookCopy, BookOpenCheck, Library, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLibraryUser } from "@/hooks/use-library-user";
import { fetchBooks, type Book } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState } from "@/components/AsyncState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/books")({
  head: () => ({
    meta: [
      { title: "Book catalog — Shelfwise" },
      { name: "description", content: "Search, filter, add, edit, and manage library books and copies." },
      { property: "og:title", content: "Book catalog — Shelfwise" },
      { property: "og:description", content: "A live, searchable library catalog with copy availability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Books,
});

const empty = { title: "", author: "", isbn: "", category: "", total_copies: 1 };

function Books() {
  const { data: me } = useLibraryUser();
  const qc = useQueryClient();
  const booksQuery = useQuery({ queryKey: ["books"], queryFn: fetchBooks });
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);
  const categories = [...new Set(books.map((book) => book.category?.trim()).filter((value): value is string => !!value))].sort();

  const list = books.filter((book) => {
    const matchesSearch = `${book.title} ${book.author} ${book.category ?? ""} ${book.isbn ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());
    const matchesCategory = category === "all" || book.category === category;
    const matchesAvailability = availability === "all" || (availability === "available" ? book.available_copies > 0 : book.available_copies === 0);
    return matchesSearch && matchesCategory && matchesAvailability;
  });
  const totalCopies = books.reduce((sum, book) => sum + book.total_copies, 0);
  const availableCopies = books.reduce((sum, book) => sum + book.available_copies, 0);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(book: Book) {
    setEditing(book);
    setForm({ title: book.title, author: book.author, isbn: book.isbn ?? "", category: book.category ?? "", total_copies: book.total_copies });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isInteger(form.total_copies) || form.total_copies < 1) { toast.error("Total copies must be at least 1."); return; }
    setSaving(true);
    const values = { title: form.title.trim(), author: form.author.trim(), isbn: form.isbn.trim() || null, category: form.category.trim() || null, total_copies: form.total_copies };
    let error;
    if (editing) {
      const onLoan = editing.total_copies - editing.available_copies;
      if (form.total_copies < onLoan) { toast.error(`${onLoan} copies are on loan — total can't be lower.`); setSaving(false); return; }
      ({ error } = await supabase.from("books").update({ ...values, available_copies: form.total_copies - onLoan }).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("books").insert({ ...values, available_copies: form.total_copies }));
    }
    setSaving(false);
    if (error) { toast.error("Couldn't save the book", { description: error.message }); return; }
    toast.success(editing ? "Book updated successfully" : "Book added to the catalog");
    setOpen(false);
    await qc.invalidateQueries({ queryKey: ["books"] });
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("books").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error("Couldn't delete the book", { description: error.message }); return; }
    toast.success(`"${deleteTarget.title}" deleted`);
    setDeleteTarget(null);
    await qc.invalidateQueries();
  }

  return (
    <div>
      <PageHeader title="Book catalog" subtitle={`${books.length} titles · ${totalCopies} copies · ${availableCopies} available now`} action={me?.isLibrarian && <Button onClick={openNew} className="rounded-xl"><Plus />Add book</Button>} />
      {booksQuery.isLoading ? <LoadingState label="Loading the book catalog…" cards={3} /> : booksQuery.error ? <ErrorState error={booksQuery.error} onRetry={booksQuery.refetch} /> : (
        <>
          <section className="mb-6 grid gap-3 rounded-2xl border bg-card p-4 shadow-card md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-10 pl-9" placeholder="Search title, author, category, or ISBN" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <Select value={category} onValueChange={setCategory}><SelectTrigger className="w-full"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Select value={availability} onValueChange={setAvailability}><SelectTrigger className="w-full"><SelectValue placeholder="All availability" /></SelectTrigger><SelectContent><SelectItem value="all">All availability</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="unavailable">All on loan</SelectItem></SelectContent></Select>
          </section>
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground"><span>Showing {list.length} of {books.length} titles</span>{(q || category !== "all" || availability !== "all") && <Button variant="ghost" size="sm" onClick={() => { setQ(""); setCategory("all"); setAvailability("all"); }}>Clear filters</Button>}</div>
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center"><Library className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-4 font-sans text-lg font-bold">No books match</h2><p className="mt-2 text-sm text-muted-foreground">Try another search or clear your filters.</p></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((book) => (
                <article key={book.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="secondary">{book.category || "Uncategorised"}</Badge>
                    <Badge className={book.available_copies > 0 ? "bg-success/10 text-success hover:bg-success/15" : "bg-destructive/10 text-destructive hover:bg-destructive/15"}>{book.available_copies > 0 ? "Available" : "All on loan"}</Badge>
                  </div>
                  <h2 className="mt-5 font-sans text-lg font-bold leading-snug">{book.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                  {book.isbn && <p className="mt-2 text-xs text-muted-foreground">ISBN {book.isbn}</p>}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted p-3"><BookOpenCheck className="h-4 w-4 text-success" /><p className="mt-2 text-lg font-bold">{book.available_copies}</p><p className="text-[11px] text-muted-foreground">Available</p></div>
                    <div className="rounded-xl bg-muted p-3"><BookCopy className="h-4 w-4 text-primary" /><p className="mt-2 text-lg font-bold">{book.total_copies}</p><p className="text-[11px] text-muted-foreground">Total copies</p></div>
                  </div>
                  {me?.isLibrarian && <div className="mt-auto flex gap-2 pt-5"><Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(book)}><Pencil />Edit</Button><Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteTarget(book)} aria-label={`Delete ${book.title}`}><Trash2 />Delete</Button></div>}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={(value) => { if (!saving) setOpen(value); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit book" : "Add a new book"}</DialogTitle><DialogDescription>{editing ? "Update the catalog details and copy count." : "Add a title to your live library catalog."}</DialogDescription></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="book-title">Title</Label><Input id="book-title" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="book-author">Author</Label><Input id="book-author" required maxLength={160} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="book-category">Category</Label><Input id="book-category" maxLength={80} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="book-isbn">ISBN</Label><Input id="book-isbn" maxLength={30} value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></div></div>
            <div className="space-y-2"><Label htmlFor="book-copies">Total copies</Label><Input id="book-copies" type="number" min={1} step={1} required value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: Number(e.target.value) })} />{editing && <p className="text-xs text-muted-foreground">{editing.total_copies - editing.available_copies} copies currently on loan.</p>}</div>
            <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="animate-spin" />}{saving ? "Saving…" : editing ? "Save changes" : "Add book"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(value) => { if (!value && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle><AlertDialogDescription>This permanently removes the book and its loan history. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); remove(); }} disabled={deleting}>{deleting && <Loader2 className="animate-spin" />}{deleting ? "Deleting…" : "Delete book"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
