drop policy if exists members_update_owner on public.book_members;

create policy members_update_owner
on public.book_members
for update
to authenticated
using (
  public.has_book_role(book_id, array['owner'])
  and user_id <> (select auth.uid())
)
with check (
  public.has_book_role(book_id, array['owner'])
  and user_id <> (select auth.uid())
  and role in ('editor', 'viewer')
);

alter publication supabase_realtime add table public.monthly_periods;
alter publication supabase_realtime add table public.book_members;
