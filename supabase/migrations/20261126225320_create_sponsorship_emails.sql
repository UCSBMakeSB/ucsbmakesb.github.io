CREATE TABLE IF NOT EXISTS public.sponsorship_emails (
  email text PRIMARY KEY,
  first_name text NOT NULL,
  last_name text,
  company text,
  first_sent date,
  follow_up date,
  response boolean,
  sponsor boolean
);

ALTER TABLE public.sponsorship_emails ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.sponsorship_emails TO service_role;
