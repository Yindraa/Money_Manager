alter table public.book_members add column expires_at timestamptz;

update public.book_members
set expires_at = now()
where role <> 'owner' and expires_at is null;

alter table public.book_members
add constraint temporary_members_require_expiry
check (
  (role = 'owner' and expires_at is null)
  or (role <> 'owner' and expires_at is not null)
);

create or replace function public.is_book_member(target_book_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_members
    where book_id = target_book_id
      and user_id = (select auth.uid())
      and (role = 'owner' or expires_at > now())
  );
$$;

create or replace function public.has_book_role(target_book_id uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_members
    where book_id = target_book_id
      and user_id = (select auth.uid())
      and role::text = any(allowed_roles)
      and (role = 'owner' or expires_at > now())
  );
$$;

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
    and expires_at is not null
    and expires_at > now()
    and (max_uses is null or usage_count < max_uses)
  for update;

  if link_row.id is null then raise exception 'Invalid or expired share link'; end if;

  insert into public.book_members (book_id, user_id, role, expires_at)
  values (link_row.book_id, current_user_id, link_row.role, link_row.expires_at)
  on conflict (book_id, user_id) do update set
    role = case
      when public.book_members.role = 'owner' then 'owner'::public.book_member_role
      when public.book_members.role = 'editor' or excluded.role = 'editor' then 'editor'::public.book_member_role
      else 'viewer'::public.book_member_role
    end,
    expires_at = case
      when public.book_members.role = 'owner' then null
      else greatest(public.book_members.expires_at, excluded.expires_at)
    end;

  update public.share_links set usage_count = usage_count + 1 where id = link_row.id;
  return link_row.book_id;
end;
$$;

revoke all on function public.accept_share_link(text) from public, anon;
grant execute on function public.accept_share_link(text) to authenticated;

-- Anonymous sessions are guests only. They may accept a link, but may not
-- create their own permanent book.
drop policy books_insert_owner on public.books;
create policy books_insert_owner on public.books for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

-- Book structure stays under the owner. Temporary editors can edit
-- transactions, but cannot change balances, categories, or payment methods.
drop policy periods_insert_editor on public.monthly_periods;
drop policy periods_update_editor on public.monthly_periods;
drop policy periods_delete_editor on public.monthly_periods;
create policy periods_insert_owner on public.monthly_periods for insert to authenticated
with check (public.has_book_role(book_id, array['owner']) and created_by = (select auth.uid()));
create policy periods_update_owner on public.monthly_periods for update to authenticated
using (public.has_book_role(book_id, array['owner']))
with check (public.has_book_role(book_id, array['owner']));
create policy periods_delete_owner on public.monthly_periods for delete to authenticated
using (public.has_book_role(book_id, array['owner']));

drop policy categories_insert_editor on public.categories;
drop policy categories_update_editor on public.categories;
drop policy categories_delete_editor on public.categories;
create policy categories_insert_owner on public.categories for insert to authenticated
with check (public.has_book_role(book_id, array['owner']));
create policy categories_update_owner on public.categories for update to authenticated
using (public.has_book_role(book_id, array['owner']))
with check (public.has_book_role(book_id, array['owner']));
create policy categories_delete_owner on public.categories for delete to authenticated
using (public.has_book_role(book_id, array['owner']));

drop policy methods_insert_editor on public.payment_methods;
drop policy methods_update_editor on public.payment_methods;
drop policy methods_delete_editor on public.payment_methods;
create policy methods_insert_owner on public.payment_methods for insert to authenticated
with check (public.has_book_role(book_id, array['owner']));
create policy methods_update_owner on public.payment_methods for update to authenticated
using (public.has_book_role(book_id, array['owner']))
with check (public.has_book_role(book_id, array['owner']));
create policy methods_delete_owner on public.payment_methods for delete to authenticated
using (public.has_book_role(book_id, array['owner']));
