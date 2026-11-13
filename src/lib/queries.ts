import { supabase } from "@/integrations/supabase/client";

export async function fetchBooks() {
  const { data, error } = await supabase.from("books").select("*").order("title");
  if (error) throw error;
  return data;
}
export async function fetchLoans() {
  const { data, error } = await supabase
    .from("loans")
    .select("*, books(title, author), profiles(full_name, email)")
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function fetchMembers() {
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) throw error;
  return data;
}
export type Loan = Awaited<ReturnType<typeof fetchLoans>>[number];
