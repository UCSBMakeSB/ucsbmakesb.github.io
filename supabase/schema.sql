-- MakeSB 2027 applications backend.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement is idempotent.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade,

  preferred_first_name text not null,
  -- Optional: some applicants go by a single name.
  last_name text,
  email text not null,
  -- Asked after admission (portal), so nullable: phone, emergency contact,
  -- age, food restrictions and the liability waiver.
  mobile_number text,
  emergency_contact_name text,
  emergency_contact_mobile_number text,

  major text not null,
  year text not null,
  age text,
  country text not null,
  school text not null,
  food_allergies text,

  -- NULL until accepted in the portal; never false.
  waiver_accepted boolean check (waiver_accepted),
  prior_hackathon_experience boolean not null,

  -- Path of the resume inside the private "resumes" storage bucket.
  resume_path text,

  application_question_1 text,
  application_question_2 text,
  application_question_3 text,
  application_question_4 text,
  application_question_5 text,
  application_question_6 text,
  application_question_7 text,
  application_question_8 text
);

-- One application per email, case-insensitive.
create unique index if not exists applications_email_unique
  on public.applications (lower(email));

alter table public.applications
  add column if not exists user_id uuid
  references auth.users(id)
  on delete cascade;

create unique index if not exists applications_user_id_unique
  on public.applications(user_id);

create table if not exists public.application_drafts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  payload jsonb not null,
  resume_path text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_at timestamptz
);

create index if not exists application_drafts_expires_at_idx
  on public.application_drafts(expires_at);

alter table public.application_drafts enable row level security;

revoke all on public.application_drafts from anon, authenticated;
grant select, insert, update, delete on public.application_drafts to service_role;

-- Lock the table down. With RLS on and NO policies, the public (anon) key can't
-- read or write anything. Only the server, using the secret/service-role key
-- (which bypasses RLS), can touch this data. That matters: it holds phone
-- numbers, emergency contacts, and allergy info.
alter table public.applications enable row level security;

alter table public.applications
  alter column food_allergies drop not null;

-- 2026-11-14: the application form no longer asks for these (they are asked
-- after admission), and last name is optional. Existing databases need this;
-- it is also in supabase/2026-11-14-apply-simplify.sql on its own.
alter table public.applications
  alter column last_name drop not null,
  alter column mobile_number drop not null,
  alter column emergency_contact_name drop not null,
  alter column emergency_contact_mobile_number drop not null,
  alter column age drop not null,
  alter column waiver_accepted drop not null;

alter table public.application_drafts
  alter column expires_at set default (now() + interval '30 days');

alter table public.applications
  add column if not exists application_question_1 text,
  add column if not exists application_question_2 text,
  add column if not exists application_question_3 text,
  add column if not exists application_question_4 text,
  add column if not exists application_question_5 text,
  add column if not exists application_question_6 text,
  add column if not exists application_question_7 text,
  add column if not exists application_question_8 text;

-- Explicit privileges, so this works whether or not "Automatically expose new
-- tables" was enabled when the project was created: the public roles get
-- nothing, and only the server key's role (service_role) can use the table.
revoke all on public.applications from anon, authenticated;
grant select, insert, update, delete on public.applications to service_role;

-- Private bucket for resumes. 4 MB cap because Vercel rejects request bodies
-- over 4.5 MB, so larger files could never reach the API anyway.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  4194304,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects already has RLS enabled and we add no policies, so only the
-- server key can read or write resume files. Organizers open them from the
-- dashboard (Storage -> resumes) or via signed URLs.
