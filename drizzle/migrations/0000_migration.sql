create type public.app_role as enum ('librarian', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own role read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'librarian'));

create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'librarian'));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid());

-- First user becomes librarian, rest are members
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.user_roles where role = 'librarian') then
    insert into public.user_roles (user_id, role) values (new.id, 'librarian');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'member');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  isbn text,
  category text,
  total_copies int not null default 1,
  available_copies int not null default 1,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.books to authenticated;
grant all on public.books to service_role;
alter table public.books enable row level security;
create policy "books read" on public.books for select to authenticated using (true);
create policy "books write" on public.books for all to authenticated
  using (public.has_role(auth.uid(), 'librarian')) with check (public.has_role(auth.uid(), 'librarian'));

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  issued_at timestamptz not null default now(),
  due_date date not null,
  returned_at timestamptz,
  fine_amount numeric not null default 0,
  fine_paid boolean not null default false
);
grant select, insert, update, delete on public.loans to authenticated;
grant all on public.loans to service_role;
alter table public.loans enable row level security;
create policy "loans read" on public.loans for select to authenticated
  using (member_id = auth.uid() or public.has_role(auth.uid(), 'librarian'));
create policy "loans write" on public.loans for all to authenticated
  using (public.has_role(auth.uid(), 'librarian')) with check (public.has_role(auth.uid(), 'librarian'));

-- Issue / return functions keep copy counts consistent
create or replace function public.issue_book(_book_id uuid, _member_id uuid, _days int default 14)
returns uuid language plpgsql security definer set search_path = public
as $$
declare _id uuid;
begin
  if not public.has_role(auth.uid(), 'librarian') then raise exception 'Only librarians can issue books'; end if;
  update public.books set available_copies = available_copies - 1
    where id = _book_id and available_copies > 0;
  if not found then raise exception 'No copies available'; end if;
  insert into public.loans (book_id, member_id, due_date)
    values (_book_id, _member_id, (current_date + _days)) returning id into _id;
  return _id;
end; $$;

create or replace function public.return_book(_loan_id uuid, _fine_per_day numeric default 5)
returns numeric language plpgsql security definer set search_path = public
as $$
declare _l public.loans; _fine numeric;
begin
  if not public.has_role(auth.uid(), 'librarian') then raise exception 'Only librarians can return books'; end if;
  select * into _l from public.loans where id = _loan_id and returned_at is null;
  if not found then raise exception 'Loan not found or already returned'; end if;
  _fine := greatest(0, current_date - _l.due_date) * _fine_per_day;
  update public.loans set returned_at = now(), fine_amount = _fine, fine_paid = (_fine = 0) where id = _loan_id;
  update public.books set available_copies = available_copies + 1 where id = _l.book_id;
  return _fine;
end; $$;

insert into public.books (title, author, isbn, category, total_copies, available_copies) values
('The God of Small Things','Arundhati Roy','9780679457312','Fiction',3,3),
('Wings of Fire','A.P.J. Abdul Kalam','9788173711466','Biography',4,4),
('Sapiens','Yuval Noah Harari','9780062316097','History',2,2),
('Clean Code','Robert C. Martin','9780132350884','Technology',2,2),
('The White Tiger','Aravind Adiga','9781416562603','Fiction',2,2),
('Atomic Habits','James Clear','9780735211292','Self-help',3,3);