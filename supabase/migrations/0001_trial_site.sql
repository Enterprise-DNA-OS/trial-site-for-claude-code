-- Trial Site for Claude Code: the business system of a clinical trial site.
-- Studies, participants, the visit schedule and its windows, sponsor money,
-- the regulatory binder, delegation, consent versions and safety reporting clocks.
-- This is not the trial's eCRF or EDC: the sponsor's data capture stays where the sponsor puts it.
-- Plain Postgres. Runs on any Postgres and on the embedded PGlite. No extensions.

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Site-wide settings the checks read. One row.
create table settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'Your research site',
  sae_report_hours int not null default 24,          -- NHMRC 2016: investigator to sponsor
  gcp_refresh_years int not null default 3,          -- your SOP's refresher interval
  progress_report_months int not null default 12,    -- National Statement 5.5.5: at least annually
  retention_years int not null default 15,           -- Australian Code / TGA note on E6(R3)
  invoice_after_days int not null default 30,        -- earned money older than this should be invoiced
  updated_at timestamptz not null default now()
);

create table sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null default 'pharma' check (kind in ('pharma','device','cro','cooperative-group','investigator-initiated')),
  contact_name text,
  email text,
  payment_terms_days int not null default 45,
  currency text not null default 'AUD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role text not null check (role in ('principal investigator','sub-investigator','study coordinator','research nurse','pharmacist','data manager','site manager','other')),
  email text,
  gcp_trained_on date,
  cv_signed_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table studies (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors(id),
  protocol text not null unique,                     -- the sponsor's protocol number
  title text not null,
  phase text,
  status text not null default 'startup' check (status in ('feasibility','startup','enrolling','follow-up','closed')),
  pi_id uuid references staff(id),
  ethics_ref text,
  ethics_approved_on date,
  last_progress_report_on date,
  target_enrolment int,
  enrolment_opens_on date,
  enrolment_closes_on date,
  consent_version text,                              -- the current approved participant information and consent form
  consent_approved_on date,
  closed_on date,
  archive_until date,
  currency text not null default 'AUD',
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The schedule of assessments: each visit, its target day and window, and what the sponsor pays for it.
create table visit_templates (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  seq int not null,
  code text not null,
  name text not null,
  day int not null,                                  -- days after the participant's baseline date
  window_before int not null default 0,
  window_after int not null default 0,
  fee_cents int not null default 0,                  -- sponsor payment per completed visit
  unique (study_id, code)
);

create table delegations (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  staff_id uuid not null references staff(id),
  tasks text not null,                               -- comma list: consent, visits, safety, dispensing, data entry
  start_on date not null,
  end_on date,
  pi_signed_on date,
  unique (study_id, staff_id, start_on)
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  subject_number text not null,
  initials text,
  status text not null default 'prescreen' check (status in ('prescreen','screening','enrolled','screen-failed','completed','withdrawn')),
  referral_source text,
  phone text,
  consented_on date,
  consent_version text,
  baseline_on date,                                  -- randomisation or day 1: the visit schedule counts from here
  ended_on date,
  end_reason text,
  coordinator_id uuid references staff(id),
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (study_id, subject_number)
);

create table visits (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  template_id uuid references visit_templates(id),
  name text not null,
  scheduled_on date,
  completed_on date,
  status text not null default 'scheduled' check (status in ('scheduled','completed','missed','cancelled')),
  performed_by uuid references staff(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, template_id)
);

create table deviations (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  participant_id uuid references participants(id),
  visit_id uuid references visits(id),
  occurred_on date not null,
  description text not null,
  reported_on date,
  created_at timestamptz not null default now()
);

create table adverse_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  description text not null,
  serious boolean not null default false,
  onset_on date,
  aware_at timestamptz not null,                     -- when the site became aware: the clock starts here
  reported_at timestamptz,                           -- when the sponsor was told
  outcome text,
  resolved_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Regulatory binder: approvals, protocol and consent versions, CVs, GCP certificates, insurance, CTN.
create table binder (
  id uuid primary key default gen_random_uuid(),
  study_id uuid references studies(id) on delete cascade,
  staff_id uuid references staff(id),
  kind text not null,
  version text,
  approved_on date,
  expires_on date,
  location text,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id),
  number text not null unique,
  issued_on date not null default current_date,
  due_on date not null,
  paid_on date,
  amount_cents int not null default 0,
  created_at timestamptz not null default now()
);

-- Money the site has earned: a completed visit, a screen failure, start-up, a pass-through cost.
create table charges (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references studies(id) on delete cascade,
  visit_id uuid unique references visits(id) on delete cascade,
  kind text not null default 'visit' check (kind in ('visit','screen-fail','start-up','pass-through','other')),
  description text not null,
  amount_cents int not null,
  earned_on date not null,
  invoice_id uuid references invoices(id),
  created_at timestamptz not null default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  study_id uuid references studies(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  title text not null default 'Note',
  body text not null,
  created_at timestamptz not null default now()
);

create trigger sponsors_touch before update on sponsors for each row execute function touch_updated_at();
create trigger staff_touch before update on staff for each row execute function touch_updated_at();
create trigger studies_touch before update on studies for each row execute function touch_updated_at();
create trigger participants_touch before update on participants for each row execute function touch_updated_at();
create trigger visits_touch before update on visits for each row execute function touch_updated_at();
create trigger adverse_events_touch before update on adverse_events for each row execute function touch_updated_at();
create trigger settings_touch before update on settings for each row execute function touch_updated_at();

insert into settings (id) values (1) on conflict (id) do nothing;

-- Every visit with its window and where it stands today.
create view v_visits as
select v.id, s.id as study_id, s.protocol, p.id as participant_id, p.subject_number, p.status as participant_status,
  v.name as visit, t.seq, v.status,
  (p.baseline_on + t.day) as target_on,
  (p.baseline_on + t.day - t.window_before) as window_opens,
  (p.baseline_on + t.day + t.window_after) as window_closes,
  coalesce(v.scheduled_on, p.baseline_on + t.day) as scheduled_on,
  v.completed_on, st.name as performed_by, c.name as coordinator,
  case
    when v.status = 'completed' and t.id is not null and p.baseline_on is not null
      and (v.completed_on < p.baseline_on + t.day - t.window_before or v.completed_on > p.baseline_on + t.day + t.window_after) then 'out of window'
    when v.status = 'completed' then 'done'
    when v.status in ('missed','cancelled') then v.status
    when p.baseline_on is not null and t.id is not null and current_date > p.baseline_on + t.day + t.window_after then 'overdue'
    when p.baseline_on is not null and t.id is not null and current_date >= p.baseline_on + t.day - t.window_before then 'window open'
    else 'upcoming'
  end as state,
  t.fee_cents, s.currency
from visits v
join participants p on p.id = v.participant_id
join studies s on s.id = p.study_id
left join visit_templates t on t.id = v.template_id
left join staff st on st.id = v.performed_by
left join staff c on c.id = p.coordinator_id;

create view v_enrolment as
select s.id as study_id, sp.name as sponsor, s.protocol, s.title, s.status, s.target_enrolment as target,
  count(p.*) filter (where p.status in ('enrolled','completed','withdrawn'))::int as enrolled,
  count(p.*) filter (where p.status = 'screening')::int as screening,
  count(p.*) filter (where p.status = 'screen-failed')::int as screen_failed,
  count(p.*) filter (where p.status = 'prescreen')::int as prescreen,
  s.enrolment_opens_on, s.enrolment_closes_on,
  case when s.target_enrolment > 0 and s.enrolment_opens_on is not null and s.enrolment_closes_on > s.enrolment_opens_on
    then round(s.target_enrolment * least(1.0, greatest(0, current_date - s.enrolment_opens_on)::numeric / (s.enrolment_closes_on - s.enrolment_opens_on)))::int end as should_have_by_now
from studies s join sponsors sp on sp.id = s.sponsor_id
left join participants p on p.study_id = s.id
group by s.id, sp.name;

-- Earned and not yet invoiced, and invoices not yet paid.
create view v_receivables as
select 'not invoiced' as state, s.protocol, sp.name as sponsor, ch.description, ch.amount_cents, s.currency,
  ch.earned_on as since, (current_date - ch.earned_on) as days, ch.id
from charges ch join studies s on s.id = ch.study_id join sponsors sp on sp.id = s.sponsor_id
where ch.invoice_id is null
union all
select case when i.due_on < current_date then 'overdue' else 'invoiced' end, s.protocol, sp.name, 'Invoice ' || i.number, i.amount_cents, s.currency,
  i.issued_on, (current_date - i.due_on), i.id
from invoices i join studies s on s.id = i.study_id join sponsors sp on sp.id = s.sponsor_id
where i.paid_on is null;

-- The record checks. Every row names its rule and its source; docs/compliance.md explains each.
create view v_compliance as
with cfg as (select * from settings where id = 1)
select 'SAE-24H' as rule, s.protocol, p.subject_number as record,
  'Serious adverse event "' || ae.description || '" ' ||
  case when ae.reported_at is null then 'not yet reported to the sponsor, aware ' || round(extract(epoch from (now() - ae.aware_at)) / 3600)::int || ' hours ago'
       else 'reported ' || round(extract(epoch from (ae.reported_at - ae.aware_at)) / 3600)::int || ' hours after the site became aware' end as finding,
  (ae.aware_at + make_interval(hours => cfg.sae_report_hours))::date as due_date,
  'NHMRC, Safety monitoring and reporting in clinical trials involving therapeutic goods (2016)' as source
from adverse_events ae cross join cfg
join participants p on p.id = ae.participant_id join studies s on s.id = p.study_id
where ae.serious and coalesce(ae.reported_at, now()) > ae.aware_at + make_interval(hours => cfg.sae_report_hours)
union all
select 'GCP-NOT-DELEGATED', s.protocol, p.subject_number || ' ' || v.name,
  st.name || ' performed the visit on ' || v.completed_on || ' with no delegation for visits on that date', v.completed_on,
  'ICH E6(R3) Annex 1, 2.3 (adopted by the TGA)'
from visits v join participants p on p.id = v.participant_id join studies s on s.id = p.study_id join staff st on st.id = v.performed_by
where v.status = 'completed' and not exists (
  select 1 from delegations d where d.study_id = s.id and d.staff_id = st.id and d.tasks ilike '%visits%'
    and d.start_on <= v.completed_on and (d.end_on is null or d.end_on >= v.completed_on))
union all
select 'GCP-TRAINING', s.protocol, st.name,
  case when st.gcp_trained_on is null then 'No GCP training date recorded'
       else 'GCP training dated ' || st.gcp_trained_on || ', older than ' || cfg.gcp_refresh_years || ' years' end,
  (st.gcp_trained_on + make_interval(years => cfg.gcp_refresh_years))::date,
  'ICH E6(R3) Annex 1, 2.1 and 2.3; refresher interval from your SOP (settings.gcp_refresh_years)'
from delegations d cross join cfg join staff st on st.id = d.staff_id join studies s on s.id = d.study_id
where s.status <> 'closed' and (d.end_on is null or d.end_on >= current_date)
  and (st.gcp_trained_on is null or st.gcp_trained_on + make_interval(years => cfg.gcp_refresh_years) < current_date)
union all
select 'CONSENT-BEFORE-VISIT', s.protocol, p.subject_number || ' ' || v.name,
  case when p.consented_on is null then 'Visit completed on ' || v.completed_on || ' with no consent date recorded'
       else 'Visit completed on ' || v.completed_on || ', consent signed ' || p.consented_on end,
  v.completed_on, 'ICH E6(R3) Annex 1, 2.8'
from visits v join participants p on p.id = v.participant_id join studies s on s.id = p.study_id
where v.status = 'completed' and (p.consented_on is null or v.completed_on < p.consented_on)
union all
select 'CONSENT-VERSION', s.protocol, p.subject_number,
  'Signed consent version ' || coalesce(p.consent_version, '(none)') || '; version ' || s.consent_version || ' approved ' || s.consent_approved_on || ' and not yet signed',
  s.consent_approved_on, 'ICH E6(R3) Annex 1, 2.8'
from participants p join studies s on s.id = p.study_id
where p.status in ('screening','enrolled') and s.consent_version is not null and coalesce(p.consent_version, '') <> s.consent_version
union all
select 'ETHICS-PROGRESS-REPORT', s.protocol, coalesce(s.ethics_ref, s.protocol),
  'Last progress report to the ethics committee ' || coalesce(greatest(s.last_progress_report_on, s.ethics_approved_on)::text, 'never') ||
  ', due every ' || cfg.progress_report_months || ' months',
  (coalesce(greatest(s.last_progress_report_on, s.ethics_approved_on), current_date) + make_interval(months => cfg.progress_report_months))::date,
  'NHMRC National Statement on Ethical Conduct in Human Research (2023), 5.5.5'
from studies s cross join cfg
where s.status not in ('feasibility','closed') and s.ethics_approved_on is not null
  and greatest(s.last_progress_report_on, s.ethics_approved_on) + make_interval(months => cfg.progress_report_months) < current_date
union all
select 'BINDER-EXPIRED', coalesce(s.protocol, 'site'), b.kind || coalesce(' ' || b.version, '') || coalesce(' (' || st.name || ')', ''),
  'Expired ' || b.expires_on, b.expires_on, 'Site SOP: essential documents current while a study is active'
from binder b left join studies s on s.id = b.study_id left join staff st on st.id = b.staff_id
where b.expires_on < current_date and (s.id is null or s.status <> 'closed')
  and not exists (select 1 from binder n where n.kind = b.kind and n.study_id is not distinct from b.study_id
    and n.staff_id is not distinct from b.staff_id and n.expires_on > b.expires_on)
union all
select 'PROTOCOL-WINDOW', vv.protocol, vv.subject_number || ' ' || vv.visit,
  'Completed ' || vv.completed_on || ', window ' || vv.window_opens || ' to ' || vv.window_closes || ', no deviation recorded',
  vv.completed_on, 'The protocol''s schedule of assessments; ICH E6(R3) Annex 1, 2.5'
from v_visits vv
where vv.state = 'out of window' and not exists (select 1 from deviations d where d.visit_id = vv.id)
union all
select 'RETENTION-15Y', s.protocol, s.title,
  case when s.archive_until is null then 'Closed ' || s.closed_on || ' with no archive date'
       else 'Archive date ' || s.archive_until || ' is less than ' || cfg.retention_years || ' years after close' end,
  s.closed_on, 'Australian Code for the Responsible Conduct of Research, as noted by the TGA on ICH E6(R3)'
from studies s cross join cfg
where s.status = 'closed' and s.closed_on is not null
  and (s.archive_until is null or s.archive_until < (s.closed_on + make_interval(years => cfg.retention_years))::date);

-- One list of what needs someone today.
create view v_attention as
select 'VISIT OVERDUE' as item, protocol, subject_number || ' ' || visit as record, coordinator as owner, window_closes as due_date,
  'Window closed ' || window_closes as detail
from v_visits where state = 'overdue' and participant_status in ('enrolled','screening')
union all
select 'VISIT DUE', protocol, subject_number || ' ' || visit, coordinator, window_closes,
  'Window open ' || window_opens || ' to ' || window_closes
from v_visits where state = 'window open' and participant_status in ('enrolled','screening')
union all
select 'SAE CLOCK', s.protocol, p.subject_number, 'Principal investigator', (ae.aware_at + interval '24 hours')::date,
  'Serious event not reported to sponsor: ' || ae.description
from adverse_events ae join participants p on p.id = ae.participant_id join studies s on s.id = p.study_id
where ae.serious and ae.reported_at is null
union all
select 'NOT INVOICED', protocol, description, 'Finance', since, amount_cents / 100 || ' ' || currency || ' earned ' || days || ' days ago'
from v_receivables, settings where state = 'not invoiced' and days > settings.invoice_after_days
union all
select 'INVOICE OVERDUE', protocol, description, sponsor, since, amount_cents / 100 || ' ' || currency || ', ' || days || ' days past due'
from v_receivables where state = 'overdue'
union all
select 'BINDER EXPIRING', coalesce(s.protocol, 'site'), b.kind || coalesce(' (' || st.name || ')', ''), 'Regulatory', b.expires_on,
  'Expires in ' || (b.expires_on - current_date) || ' days'
from binder b left join studies s on s.id = b.study_id left join staff st on st.id = b.staff_id
where b.expires_on between current_date and current_date + 30
union all
select 'ENROLMENT BEHIND', protocol, title, sponsor, enrolment_closes_on,
  enrolled || ' enrolled, ' || should_have_by_now || ' expected by now of ' || target
from v_enrolment where status = 'enrolling' and should_have_by_now is not null and enrolled < should_have_by_now;
