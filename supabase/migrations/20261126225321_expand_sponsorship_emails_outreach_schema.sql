-- Non-destructive: keep existing columns and the email primary key.
-- Add outreach-tracking fields for MakeSB sponsor CRM use.

ALTER TABLE public.sponsorship_emails
  ADD COLUMN IF NOT EXISTS contact_role text,
  ADD COLUMN IF NOT EXISTS source_inbox text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS amount_committed numeric(12,2),
  ADD COLUMN IF NOT EXISTS in_kind text,
  ADD COLUMN IF NOT EXISTS last_contact_date date,
  ADD COLUMN IF NOT EXISTS next_step text,
  ADD COLUMN IF NOT EXISTS next_step_due date,
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS gmail_thread_id text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.sponsorship_emails
  ADD CONSTRAINT sponsorship_emails_status_check
  CHECK (status IS NULL OR status IN (
    'prospect', 'contacted', 'replied', 'meeting', 'committed', 'paid', 'declined', 'no_response'
  ));

ALTER TABLE public.sponsorship_emails
  ADD CONSTRAINT sponsorship_emails_source_inbox_check
  CHECK (source_inbox IS NULL OR source_inbox IN (
    'team@makesb.org', 'patrick_liu@ucsb.edu', 'both'
  ));

CREATE INDEX IF NOT EXISTS sponsorship_emails_company_idx
  ON public.sponsorship_emails (company);
CREATE INDEX IF NOT EXISTS sponsorship_emails_status_idx
  ON public.sponsorship_emails (status);
CREATE INDEX IF NOT EXISTS sponsorship_emails_source_inbox_idx
  ON public.sponsorship_emails (source_inbox);
CREATE INDEX IF NOT EXISTS sponsorship_emails_last_contact_idx
  ON public.sponsorship_emails (last_contact_date);

COMMENT ON TABLE public.sponsorship_emails IS
  'Sponsor outreach tracker: one row per company-contact email. Original columns (email, first_name, last_name, company, first_sent, follow_up, response, sponsor) are retained; outreach fields were added for status, cash/in-kind, next steps, owner, and Gmail thread links.';

COMMENT ON COLUMN public.sponsorship_emails.email IS 'Contact email; primary key.';
COMMENT ON COLUMN public.sponsorship_emails.first_sent IS 'Date of first outreach to this contact.';
COMMENT ON COLUMN public.sponsorship_emails.follow_up IS 'Kept in sync with next_step_due: date the next follow-up is due.';
COMMENT ON COLUMN public.sponsorship_emails.response IS 'True if the contact has replied (status in replied, meeting, committed, paid, declined).';
COMMENT ON COLUMN public.sponsorship_emails.sponsor IS 'True if status is committed or paid.';
COMMENT ON COLUMN public.sponsorship_emails.source_inbox IS 'Inbox the thread was found in: team@makesb.org, patrick_liu@ucsb.edu, or both.';
COMMENT ON COLUMN public.sponsorship_emails.status IS 'prospect, contacted, replied, meeting, committed, paid, declined, or no_response.';
COMMENT ON COLUMN public.sponsorship_emails.amount_committed IS 'Cash amount committed, in USD. Null if none or unknown. Not collected unless status is paid.';
COMMENT ON COLUMN public.sponsorship_emails.in_kind IS 'Description of in-kind, hardware, or swag offers.';
COMMENT ON COLUMN public.sponsorship_emails.gmail_thread_id IS 'Primary Gmail thread id. When a thread exists in both inboxes, prefer the team@ id and note the UCSB id in notes if different.';

CREATE OR REPLACE FUNCTION public.set_sponsorship_emails_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_sponsorship_emails_updated_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_sponsorship_emails_updated_at ON public.sponsorship_emails;
CREATE TRIGGER trg_sponsorship_emails_updated_at
  BEFORE UPDATE ON public.sponsorship_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sponsorship_emails_updated_at();
;
