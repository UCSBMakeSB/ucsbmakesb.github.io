-- Read-only RLS verification. Paste into the Supabase SQL editor (test AND prod).
-- Every row in the result should have ok = true. Changes nothing.

with checks as (
  -- 1. RLS is enabled (and forced off for no one) on both tables
  select 'rls enabled: ' || c.relname as check_name, c.relrowsecurity as ok
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('applications', 'application_drafts')

  union all
  -- 2. No policies exist: the app only uses the service-role key
  select 'no policies on public.' || t.tablename,
         not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)
  from (values ('applications'), ('application_drafts')) as t(tablename)

  union all
  -- 3. anon / authenticated hold no table privileges
  select role_name || ' has no privileges on public.' || table_name,
         not exists (
           select 1 from information_schema.role_table_grants g
           where g.table_schema = 'public' and g.table_name = tt.table_name and g.grantee = rr.role_name
         )
  from (values ('applications'), ('application_drafts')) as tt(table_name)
  cross join (values ('anon'), ('authenticated')) as rr(role_name)

  union all
  -- 4. resumes bucket is private with the expected limits
  select 'resumes bucket is private', coalesce((select not public from storage.buckets where id = 'resumes'), false)
  union all
  select 'resumes bucket limited to 4 MB', coalesce((select file_size_limit = 4194304 from storage.buckets where id = 'resumes'), false)

  union all
  -- 5. No storage.objects policy mentions the resumes bucket
  select 'no storage policies for resumes bucket',
         not exists (
           select 1 from pg_policies p
           where p.schemaname = 'storage' and p.tablename = 'objects'
             and (coalesce(p.qual, '') || coalesce(p.with_check, '')) ilike '%resumes%'
         )
)
select check_name, ok from checks order by ok, check_name;
