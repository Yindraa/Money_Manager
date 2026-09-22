drop policy if exists books_select_member on public.books;

create policy books_select_member
on public.books
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_book_member(id)
);
