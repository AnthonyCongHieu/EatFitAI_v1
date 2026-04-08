-- Supabase Storage bootstrap for EatFitAI cloud deployment
-- Run this after importing supabase_schema.sql.

insert into storage.buckets (id, name, public)
values
    ('food-images', 'food-images', true),
    ('user-food', 'user-food', true)
on conflict (id) do update
set public = excluded.public;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Public read access for food-images'
    ) then
        create policy "Public read access for food-images"
        on storage.objects
        for select
        to public
        using (bucket_id = 'food-images');
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Public read access for user-food'
    ) then
        create policy "Public read access for user-food"
        on storage.objects
        for select
        to public
        using (bucket_id = 'user-food');
    end if;
end $$;
