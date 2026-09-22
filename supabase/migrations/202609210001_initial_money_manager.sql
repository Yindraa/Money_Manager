create extension if not exists pgcrypto with schema extensions;

create type public.book_member_role as enum ('owner', 'editor', 'viewer');
create type public.transaction_type as enum ('expense', 'income');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  currency char(3) not null default 'IDR',
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.book_members (
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.book_member_role not null,
  joined_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

create table public.monthly_periods (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  opening_balance numeric(14, 2) not null default 0 check (opening_balance >= 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, month)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#64748b',
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (book_id, id)
);

create unique index categories_book_name_unique on public.categories (book_id, lower(name));

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (book_id, id)
);

create unique index payment_methods_book_name_unique on public.payment_methods (book_id, lower(name));

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  transaction_date date not null,
  description text not null check (char_length(description) between 2 and 160),
  category_id uuid not null,
  type public.transaction_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  payment_method_id uuid not null,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_category_book_fk foreign key (book_id, category_id) references public.categories(book_id, id),
  constraint transactions_payment_book_fk foreign key (book_id, payment_method_id) references public.payment_methods(book_id, id)
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  token_hash text not null unique,
  role public.book_member_role not null check (role in ('editor', 'viewer')),
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  revoked_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index transactions_book_date_idx on public.transactions (book_id, transaction_date desc);
create index transactions_book_category_idx on public.transactions (book_id, category_id);
create index book_members_user_idx on public.book_members (user_id, book_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger books_set_updated_at before update on public.books for each row execute function public.set_updated_at();
create trigger monthly_periods_set_updated_at before update on public.monthly_periods for each row execute function public.set_updated_at();

create or replace function public.set_transaction_update_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

create trigger transactions_set_update_fields before update on public.transactions for each row execute function public.set_transaction_update_fields();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_new_book()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.book_members (book_id, user_id, role) values (new.id, new.owner_id, 'owner');
  insert into public.categories (book_id, name, color) values
    (new.id, 'Makanan/Minuman', '#ef8f63'),
    (new.id, 'Transportasi', '#5b8def'),
    (new.id, 'Kost', '#2f7d68'),
    (new.id, 'Belanja', '#a78bfa'),
    (new.id, 'Kebutuhan Sehari-hari', '#e6a23c'),
    (new.id, 'Listrik', '#eab308'),
    (new.id, 'Software/Subscription', '#64748b'),
    (new.id, 'Lain-lain', '#94a3b8');
  insert into public.payment_methods (book_id, name) values
    (new.id, 'QRIS'), (new.id, 'Transfer'), (new.id, 'Tunai');
  return new;
end;
$$;

create trigger on_book_created after insert on public.books for each row execute function public.handle_new_book();

create or replace function public.is_book_member(target_book_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_members
    where book_id = target_book_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.has_book_role(target_book_id uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_members
    where book_id = target_book_id
      and user_id = (select auth.uid())
      and role::text = any(allowed_roles)
  );
$$;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.book_members enable row level security;
alter table public.monthly_periods enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.share_links enable row level security;

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.profiles, public.books, public.book_members, public.monthly_periods, public.categories, public.payment_methods, public.transactions, public.share_links to authenticated;

create policy profiles_select_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy books_select_member on public.books for select to authenticated using (public.is_book_member(id));
create policy books_insert_owner on public.books for insert to authenticated with check (owner_id = (select auth.uid()));
create policy books_update_owner on public.books for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy books_delete_owner on public.books for delete to authenticated using (owner_id = (select auth.uid()));

create policy members_select_member on public.book_members for select to authenticated using (public.is_book_member(book_id));
create policy members_insert_owner on public.book_members for insert to authenticated with check (public.has_book_role(book_id, array['owner']) and role in ('editor', 'viewer'));
create policy members_update_owner on public.book_members for update to authenticated using (public.has_book_role(book_id, array['owner']) and user_id <> (select auth.uid())) with check (role in ('editor', 'viewer'));
create policy members_delete_owner on public.book_members for delete to authenticated using (public.has_book_role(book_id, array['owner']) and user_id <> (select auth.uid()));

create policy periods_select_member on public.monthly_periods for select to authenticated using (public.is_book_member(book_id));
create policy periods_insert_editor on public.monthly_periods for insert to authenticated with check (public.has_book_role(book_id, array['owner', 'editor']) and created_by = (select auth.uid()));
create policy periods_update_editor on public.monthly_periods for update to authenticated using (public.has_book_role(book_id, array['owner', 'editor'])) with check (public.has_book_role(book_id, array['owner', 'editor']));
create policy periods_delete_editor on public.monthly_periods for delete to authenticated using (public.has_book_role(book_id, array['owner', 'editor']));

create policy categories_select_member on public.categories for select to authenticated using (public.is_book_member(book_id));
create policy categories_insert_editor on public.categories for insert to authenticated with check (public.has_book_role(book_id, array['owner', 'editor']));
create policy categories_update_editor on public.categories for update to authenticated using (public.has_book_role(book_id, array['owner', 'editor'])) with check (public.has_book_role(book_id, array['owner', 'editor']));
create policy categories_delete_editor on public.categories for delete to authenticated using (public.has_book_role(book_id, array['owner', 'editor']));

create policy methods_select_member on public.payment_methods for select to authenticated using (public.is_book_member(book_id));
create policy methods_insert_editor on public.payment_methods for insert to authenticated with check (public.has_book_role(book_id, array['owner', 'editor']));
create policy methods_update_editor on public.payment_methods for update to authenticated using (public.has_book_role(book_id, array['owner', 'editor'])) with check (public.has_book_role(book_id, array['owner', 'editor']));
create policy methods_delete_editor on public.payment_methods for delete to authenticated using (public.has_book_role(book_id, array['owner', 'editor']));

create policy transactions_select_member on public.transactions for select to authenticated using (public.is_book_member(book_id));
create policy transactions_insert_editor on public.transactions for insert to authenticated with check (public.has_book_role(book_id, array['owner', 'editor']) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy transactions_update_editor on public.transactions for update to authenticated using (public.has_book_role(book_id, array['owner', 'editor'])) with check (public.has_book_role(book_id, array['owner', 'editor']) and updated_by = (select auth.uid()));
create policy transactions_delete_editor on public.transactions for delete to authenticated using (public.has_book_role(book_id, array['owner', 'editor']));

create policy share_links_select_owner on public.share_links for select to authenticated using (public.has_book_role(book_id, array['owner']));
create policy share_links_insert_owner on public.share_links for insert to authenticated with check (public.has_book_role(book_id, array['owner']) and created_by = (select auth.uid()));
create policy share_links_update_owner on public.share_links for update to authenticated using (public.has_book_role(book_id, array['owner'])) with check (public.has_book_role(book_id, array['owner']));
create policy share_links_delete_owner on public.share_links for delete to authenticated using (public.has_book_role(book_id, array['owner']));

create or replace function public.create_book_with_opening_balance(
  book_name text,
  start_month date,
  opening_balance numeric
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  new_book_id uuid;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(book_name)) not between 2 and 80 then raise exception 'Invalid book name'; end if;
  if extract(day from start_month) <> 1 then raise exception 'Month must use the first day'; end if;
  if opening_balance < 0 then raise exception 'Opening balance cannot be negative'; end if;

  insert into public.books (owner_id, name)
  values (current_user_id, trim(book_name))
  returning id into new_book_id;

  insert into public.monthly_periods (book_id, month, opening_balance, created_by)
  values (new_book_id, start_month, opening_balance, current_user_id);

  return new_book_id;
end;
$$;

revoke all on function public.create_book_with_opening_balance(text, date, numeric) from public, anon;
grant execute on function public.create_book_with_opening_balance(text, date, numeric) to authenticated;

create or replace function public.accept_share_link(raw_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  link_row public.share_links%rowtype;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into link_row from public.share_links
  where token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
    and revoked_at is null
    and (expires_at is null or expires_at > now())
    and (max_uses is null or usage_count < max_uses)
  for update;

  if link_row.id is null then raise exception 'Invalid or expired share link'; end if;

  insert into public.book_members (book_id, user_id, role)
  values (link_row.book_id, current_user_id, link_row.role)
  on conflict (book_id, user_id) do update set role = case
    when public.book_members.role = 'owner' then 'owner'::public.book_member_role
    when public.book_members.role = 'editor' or excluded.role = 'editor' then 'editor'::public.book_member_role
    else 'viewer'::public.book_member_role
  end;

  update public.share_links set usage_count = usage_count + 1 where id = link_row.id;
  return link_row.book_id;
end;
$$;

revoke all on function public.accept_share_link(text) from public, anon;
grant execute on function public.accept_share_link(text) to authenticated;

alter publication supabase_realtime add table public.transactions;
