-- Every newsletter and waiting-list signup, recorded before it is sent on.
--
-- The Netlify function this replaces relied on Netlify Forms holding an audit
-- copy: "a Brevo outage degrades to 'not segmented yet' rather than 'lost'".
-- Leaving Netlify takes that copy away, and a signup is the one thing on this
-- site a visitor actually gives us — losing one to an upstream outage is not
-- acceptable.
--
-- So the row is written here first and pushed to Brevo second. Brevo still owns
-- the list and the sending; this is the receipt, and the thing to replay from
-- if Brevo was down.

create table if not exists public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  form_name     text not null check (form_name in ('newsletter', 'waitlist')),
  email         text not null,
  name          text,
  age           text,
  gemeente      text,
  -- The waiting list collects a child's first name and age, so the guardian's
  -- consent is recorded, not assumed.
  consent       boolean not null default false,
  event_slug    text,
  locale        text not null default 'nl',
  -- Where the signup came from: the brief asks which campaign drove each one.
  page          text,
  landing_page  text,
  referrer      text,
  campaign      jsonb not null default '{}'::jsonb,
  -- What happened when we handed it to Brevo. Null while unattempted.
  brevo_ok      boolean,
  brevo_status  integer,
  brevo_error   text,
  created_at    timestamptz not null default now()
);

create index if not exists subscriptions_created_idx on public.subscriptions (created_at desc);
create index if not exists subscriptions_form_idx    on public.subscriptions (form_name);
create index if not exists subscriptions_event_idx   on public.subscriptions (event_slug);

alter table public.subscriptions enable row level security;

-- No policy for anon on purpose: this table holds children's first names and
-- ages alongside a guardian's email, and an accidental select policy would
-- expose the lot. anon gets no grant at all, so the public site cannot read it
-- even by mistake.
--
-- The grants follow the pattern the other tables use — RLS decides the rows,
-- the grant decides whether the role can see the table at all. Skipping them
-- gives "permission denied for table", which reads like an RLS problem and is
-- not. A signed-in backoffice user may read; only the service role writes.
grant all on public.subscriptions to service_role;
grant select on public.subscriptions to authenticated;

create policy "signed-in staff may read signups"
  on public.subscriptions for select to authenticated using (true);

comment on table public.subscriptions is
  'Receipt for every signup, written before Brevo is called. Service-role only.';
