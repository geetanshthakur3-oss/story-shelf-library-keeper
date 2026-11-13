import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLibraryUser } from "@/hooks/use-library-user";
import { fetchBooks } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/books")({
  head: () => ({ meta: [{ title: "Books — Shelfwise" }, { name: "description", content: "Library book catalog." }] }),
  component: Books,
});

type Book = Awaited<ReturnType<typeof fetchBooks>>[number];
const empty = { title: "", author: "", isbn: "", category: "", total_copies: 1 };

function Books() {
  const { data: me } = useLibraryUser();
  const qc = useQueryClient();
  const { data: books = [] } = useQuery({ queryKey: ["books"], queryFn: fetchBooks });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState(empty);

  const list = books.filter((b) => `${b.title} ${b.author} ${b.category ?? ""} ${b.isbn ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(b: Book) {
    setEditing(b);
    setForm({ title: b.title, author: b.author, isbn: b.isbn ?? "", category: b.category ?? "", total_copies: b.total_copies });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    let error;
    if (editing) {
      const onLoan = editing.total_copies - editing.available_copies;
      if (form.total_copies < onLoan) { toast.error(`${onLoan} copies are on loan — total can't be lower.`); return; }
      ({ error } = await supabase.from("books").update({ ...form, available_copies: form.total_copies - onLoan }).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("books").insert({ ...form, available_copies: form.total_copies }));
    }
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Book updated" : "Book added");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["books"] });
  }

  async function remove(b: Book) {
    if (!confirm(`Delete "${b.title}"? Its loan history will be removed too.`)) return;
    const { error } = await supabase.from("books").delete().eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Book deleted");
    qc.invalidateQueries();
  }

  return (
    <div>
      <PageHeader title="Books" subtitle={`${books.length} titles in the catalog`}
        action={me?.isLibrarian && <Button onClick={openNew}><Plus className="h-4 w-4" />Add book</Button>} />
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9 bg-card" placeholder="Search title, author, category, ISBN" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((b) => (
          <div key={b.id} className="rounded-lg border bg-card p-5 shadow-card flex flex-col">
            <div className="flex items-start justify-between gap-2">
              {b.category && <Badge variant="secondary">{b.category}</Badge>}
              <Badge className={b.available_copies > 0 ? "bg-success text-primary-foreground" : "bg-destructive text-destructive-foreground"}>
                {b.available_copies > 0 ? `${b.available_copies} of ${b.total_copies} available` : "All on loan"}
              </Badge>
            </div>
            <h3 className="mt-4 text-xl font-semibold leading-snug">{b.title}</h3>
            <p className="text-sm text-muted-foreground">{b.author}</p>
            {b.isbn && <p className="text-xs text-muted-foreground mt-1">ISBN {b.isbn}</p>}
            {me?.isLibrarian && (
              <div className="mt-auto pt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="text-muted-foreground">No books found.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit book" : "Add book"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Author</Label><Input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>ISBN</Label><Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Total copies</Label><Input type="number" min={1} required value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: Number(e.target.value) })} /></div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
