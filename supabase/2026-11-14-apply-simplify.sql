-- MakeSB: shorter application form (branch apply-simplify, 2026-11-14).
--
-- RUN THIS BEFORE DEPLOYING THE BRANCH. Supabase dashboard -> SQL Editor ->
-- New query -> paste -> Run. It is safe to run more than once, changes no
-- existing data, and is backward compatible: the site as currently deployed
-- keeps working after it has run.
--
-- Why: the application form no longer asks for phone, emergency contact, age,
-- food restrictions or the liability waiver (those are asked after admission,
-- in the portal), and last name is optional. The columns below were NOT NULL,
-- so without this change every new application fails to save with
-- "null value in column ... violates not-null constraint" (Postgres 23502).

alter table public.applications
  alter column last_name drop not null,
  alter column mobile_number drop not null,
  alter column emergency_contact_name drop not null,
  alter column emergency_contact_mobile_number drop not null,
  alter column age drop not null,
  alter column waiver_accepted drop not null;

-- waiver_accepted keeps its check (waiver_accepted): the column is now either
-- NULL (not accepted yet) or true. It can still never be false.

-- Drafts now live 30 days instead of 30 minutes. The app sets expires_at
-- itself on every insert; this only keeps the column default consistent.
alter table public.application_drafts
  alter column expires_at set default (now() + interval '30 days');

-- Verify (every row should say YES):
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'applications'
  and column_name in (
    'last_name', 'mobile_number', 'emergency_contact_name',
    'emergency_contact_mobile_number', 'age', 'waiver_accepted'
  )
order by column_name;
