-- MakeSB 2027 applications backend.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement is idempotent.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  preferred_first_name text not null,
  last_name text not null,
  email text not null,
  mobile_number text not null,
  emergency_contact_name text not null,
  emergency_contact_mobile_number text not null,

  major text not null,
  year text not null,
  age text not null,
  country text not null,
  school text not null,
  food_allergies text,

  waiver_accepted boolean not null check (waiver_accepted),
  prior_hackathon_experience boolean not null,

  -- Path of the resume inside the private "resumes" storage bucket.
  resume_path text
);

-- One application per email, case-insensitive.
create unique index if not exists applications_email_unique
  on public.applications (lower(email));

-- Lock the table down. With RLS on and NO policies, the public (anon) key can't
-- read or write anything. Only the server, using the secret/service-role key
-- (which bypasses RLS), can touch this data. That matters: it holds phone
-- numbers, emergency contacts, and allergy info.
alter table public.applications enable row level security;

alter table public.applications
  alter column food_allergies drop not null;

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
