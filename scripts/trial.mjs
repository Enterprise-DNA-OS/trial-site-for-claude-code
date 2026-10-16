#!/usr/bin/env node
// One CLI for the trial site database. Human tables by default, --json for machines.
//   node scripts/trial.mjs help
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv, pick } from './lib/csv.mjs';
import { table, money } from './lib/format.mjs';

// Writable fields per record kind. Anything else is rejected.
export const entities = {
  sponsors: ['name', 'kind', 'contact_name', 'email', 'payment_terms_days', 'currency'],
  staff: ['name', 'role', 'email', 'gcp_trained_on', 'cv_signed_on', 'active'],
  studies: ['sponsor_id', 'protocol', 'title', 'phase', 'status', 'pi_id', 'ethics_ref', 'ethics_approved_on', 'last_progress_report_on', 'target_enrolment',
    'enrolment_opens_on', 'enrolment_closes_on', 'consent_version', 'consent_approved_on', 'closed_on', 'archive_until', 'currency', 'external_id'],
  visit_templates: ['study_id', 'seq', 'code', 'name', 'day', 'window_before', 'window_after', 'fee_cents'],
  delegations: ['study_id', 'staff_id', 'tasks', 'start_on', 'end_on', 'pi_signed_on'],
  participants: ['study_id', 'subject_number', 'initials', 'status', 'referral_source', 'phone', 'consented_on', 'consent_version', 'baseline_on', 'ended_on', 'end_reason', 'coordinator_id', 'external_id'],
  binder: ['study_id', 'staff_id', 'kind', 'version', 'approved_on', 'expires_on', 'location'],
  charges: ['study_id', 'kind', 'description', 'amount_cents', 'earned_on'],
  deviations: ['study_id', 'participant_id', 'occurred_on', 'description', 'reported_on'],
  adverse_events: ['participant_id', 'description', 'serious', 'onset_on', 'aware_at', 'reported_at', 'outcome', 'resolved_on'],
  invoices: ['study_id', 'number', 'issued_on', 'due_on', 'paid_on'],
  notes: ['study_id', 'participant_id', 'title', 'body'],
};
// Which column a person uses to name a record, and which table a reference field points at.
const label = { sponsors: 'name', staff: 'name', studies: 'protocol', visit_templates: 'code', delegations: 'tasks', participants: 'subject_number', binder: 'kind',
  charges: 'description', deviations: 'description', adverse_events: 'description', invoices: 'number', notes: 'title' };
const refs = { sponsor_id: 'sponsors', study_id: 'studies', staff_id: 'staff', pi_id: 'staff', coordinator_id: 'staff', participant_id: 'participants' };
// Money flags in dollars, stored in cents.
const dollarFlags = { fee: 'fee_cents', amount: 'amount_cents' };

const need = (v, msg) => { if (v === undefined || v === null || v === '' || v === true) throw Error(msg); return v; };
const entity = (v) => { if (!Object.hasOwn(entities, v)) throw Error(`Unknown kind ${v}. Choose ${Object.keys(entities).join(', ')}`); return v; };
const today = () => new Date().toISOString().slice(0, 10);

export function parseArgs(args) {
  const pos = [], flags = {};
  for (const s of args) {
    if (s.startsWith('--')) { const i = s.indexOf('='); flags[s.slice(2, i < 0 ? undefined : i)] = i < 0 ? true : s.slice(i + 1); }
    else pos.push(s);
  }
  return { pos, flags };
}

// Exact id or name first (case-insensitive), then id prefix or name fragment. One match or an error listing them.
export async function resolve(db, kind, value) {
  entity(kind); need(value, `Specify a ${kind} name or id`);
  const key = label[kind];
  let rows = await db.query(`select * from ${kind} where id::text=$1 or lower(${key})=lower($1)`, [String(value)]);
  if (!rows.length) rows = await db.query(`select * from ${kind} where starts_with(id::text,lower($1)) or position(lower($1) in lower(${key}))>0 order by ${key}`, [String(value)]);
  if (rows.length !== 1) {
    const error = Error(rows.length ? `Ambiguous ${kind}: ${rows.map((r) => `${r.id} ${r[key]}`).join('; ')}` : `No ${kind} match: ${value}`);
    error.matches = rows.map((r) => ({ id: r.id, name: r[key] }));
    throw error;
  }
  return rows[0];
}

// One visit: a participant plus the visit's code or name ("301-002 V3", "210-003 day 90").
async function resolveVisit(db, subject, visit) {
  const p = await resolve(db, 'participants', subject);
  need(visit, 'Specify the visit code or name, for example V3 or "Week 8"');
  let rows = await db.query(`select v.*,t.code,t.fee_cents from visits v left join visit_templates t on t.id=v.template_id where v.participant_id=$1 and (lower(t.code)=lower($2) or lower(v.name)=lower($2))`, [p.id, visit]);
  if (!rows.length) rows = await db.query(`select v.*,t.code,t.fee_cents from visits v left join visit_templates t on t.id=v.template_id where v.participant_id=$1 and position(lower($2) in lower(v.name))>0`, [p.id, visit]);
  if (rows.length !== 1) {
    const error = Error(rows.length ? `Ambiguous visit for ${p.subject_number}: ${rows.map((r) => r.name).join('; ')}` : `No visit "${visit}" for ${p.subject_number}`);
    error.matches = rows.map((r) => ({ id: r.id, name: r.name }));
    throw error;
  }
  return { participant: p, visit: rows[0] };
}

function cents(v) {
  if (v === null || v === undefined || v === '' || v === true) return null;
  const n = Number(String(v).replace(/[$,\s]|AUD|NZD|USD/gi, ''));
  if (!Number.isFinite(n)) throw Error(`Not an amount: ${v}`);
  return Math.round(n * 100);
}

function toDate(v, where = 'Date') {
  if (!v) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = s.match(/^(\d{1,2})[/-](\d{1,2}|[A-Za-z]{3})[/-](\d{4})/);
    if (d) {
      const mon = /^\d/.test(d[2]) ? d[2].padStart(2, '0') : String(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(d[2].toLowerCase()) + 1).padStart(2, '0');
      m = [null, d[3], mon, d[1].padStart(2, '0')];
    }
  }
  if (!m) throw Error(`${where}: "${s}" is not a date (use YYYY-MM-DD or DD/MM/YYYY)`);
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  if (Number.isNaN(Date.parse(iso + 'T00:00:00Z')) || new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) !== iso) throw Error(`${where}: "${s}" is not a real date`);
  return iso;
}

export const insightQueries = [
  ['Which sponsors pay us slowest, against their own payment terms?',
    `select sp.name as sponsor,count(*)::int as invoices_paid,round(avg(i.paid_on-i.issued_on))::int as avg_days_to_pay,sp.payment_terms_days as terms,
      round(avg(i.paid_on-i.issued_on))::int-sp.payment_terms_days as days_over_terms,
      (select count(*) from invoices u join studies s2 on s2.id=u.study_id where s2.sponsor_id=sp.id and u.paid_on is null)::int as unpaid_now
     from invoices i join studies s on s.id=i.study_id join sponsors sp on sp.id=s.sponsor_id where i.paid_on is not null
     group by sp.id order by avg_days_to_pay desc`],
  ['How much have we earned and not yet invoiced, by study and age?',
    `select protocol,sponsor,currency,round(sum(amount_cents) filter (where days<=30)/100.0) as under_30_days,round(sum(amount_cents) filter (where days between 31 and 60)/100.0) as days_31_60,
      round(sum(amount_cents) filter (where days>60)/100.0) as over_60_days,round(sum(amount_cents)/100.0) as total from v_receivables where state='not invoiced' group by protocol,sponsor,currency order by total desc`],
  ['Which studies are behind their enrolment pace?',
    `select protocol,sponsor,target,enrolled,should_have_by_now,should_have_by_now-enrolled as behind_by,screening,enrolment_closes_on,enrolment_closes_on-current_date as days_left
     from v_enrolment where status='enrolling' and should_have_by_now is not null order by behind_by desc`],
  ['Which referral sources bring participants who actually enrol?',
    `select coalesce(referral_source,'(not recorded)') as source,count(*)::int as referred,count(*) filter (where status in ('enrolled','completed','withdrawn'))::int as enrolled,
      count(*) filter (where status='screen-failed')::int as screen_failed,
      round(100.0*count(*) filter (where status in ('enrolled','completed','withdrawn'))/count(*))::int as enrol_pct from participants group by 1 order by enrol_pct desc,referred desc`],
  ['Who has run the most visits outside the protocol window?',
    `select coalesce(performed_by,'(not recorded)') as staff,count(*) filter (where state='out of window')::int as out_of_window,count(*) filter (where state in ('done','out of window'))::int as visits_done,
      string_agg(case when state='out of window' then protocol||' '||subject_number||' '||visit end,'; ') as which from v_visits group by 1 having count(*) filter (where state in ('done','out of window'))>0 order by out_of_window desc,visits_done desc`],
  ["What is each study's screen failure rate, and which screen failures have no fee recorded?",
    `select s.protocol,count(p.*) filter (where p.status<>'prescreen')::int as screened,count(p.*) filter (where p.status='screen-failed')::int as screen_failed,
      round(100.0*count(p.*) filter (where p.status='screen-failed')/nullif(count(p.*) filter (where p.status<>'prescreen'),0))::int as fail_pct,
      string_agg(case when p.status='screen-failed' and not exists (select 1 from charges c where c.study_id=s.id and c.kind='screen-fail' and c.description ilike p.subject_number||'%') then p.subject_number end,', ') as no_fee_recorded
     from studies s left join participants p on p.study_id=s.id where s.status<>'feasibility' group by s.id having count(p.*)>0 order by fail_pct desc nulls last`],
  ['Which participants have a visit due in the next 14 days and have missed or run late before?',
    `select d.protocol,d.subject_number,d.visit as next_visit,d.window_opens,d.window_closes,d.coordinator,
      count(h.*) filter (where h.state in ('missed','out of window','overdue'))::int as missed_or_late_before
     from v_visits d join v_visits h on h.participant_id=d.participant_id and h.id<>d.id
     where d.state in ('window open','upcoming','overdue') and d.window_opens<=current_date+14 and d.participant_status in ('enrolled','screening')
     group by d.protocol,d.subject_number,d.visit,d.window_opens,d.window_closes,d.coordinator having count(h.*) filter (where h.state in ('missed','out of window','overdue'))>0 order by d.window_closes`],
  ['Which studies have the most protocol deviations per enrolled participant, counting late visits nobody recorded?',
    `select e.protocol,e.enrolled,(select count(*) from deviations d where d.study_id=e.study_id)::int as recorded,
      (select count(*) from v_compliance c where c.rule='PROTOCOL-WINDOW' and c.protocol=e.protocol)::int as unrecorded_late_visits,
      round(((select count(*) from deviations d where d.study_id=e.study_id)+(select count(*) from v_compliance c where c.rule='PROTOCOL-WINDOW' and c.protocol=e.protocol))::numeric/nullif(e.enrolled,0),2) as per_participant
     from v_enrolment e where e.enrolled>0 order by per_participant desc`],
  ['Which coordinators carry the most visit windows in the next 30 days?',
    `select coalesce(coordinator,'(unassigned)') as coordinator,count(*)::int as visits_next_30_days,count(*) filter (where state='overdue')::int as already_overdue,
      count(distinct participant_id)::int as participants,string_agg(distinct protocol,', ') as studies
     from v_visits where state in ('window open','upcoming','overdue') and window_opens<=current_date+30 and participant_status in ('enrolled','screening') group by 1 order by visits_next_30_days desc`],
  ['How much has each study earned per enrolled participant against the full schedule value?',
    `select e.protocol,s.currency,e.enrolled,round(coalesce((select sum(amount_cents) from charges c where c.study_id=e.study_id and c.kind='visit'),0)/100.0) as visit_income,
      round(coalesce((select sum(amount_cents) from charges c where c.study_id=e.study_id and c.kind='visit'),0)/100.0/nullif(e.enrolled,0)) as per_participant_so_far,
      round(coalesce((select sum(fee_cents) from visit_templates t where t.study_id=e.study_id),0)/100.0) as full_schedule_per_participant
     from v_enrolment e join studies s on s.id=e.study_id where e.enrolled>0 order by e.protocol`],
];

const reads = {
  sponsors: `select sp.id,sp.name,sp.kind,sp.contact_name,sp.email,sp.payment_terms_days as terms_days,sp.currency,(select count(*) from studies s where s.sponsor_id=sp.id and s.status<>'closed')::int as active_studies from sponsors sp order by sp.name`,
  staff: `select st.id,st.name,st.role,st.gcp_trained_on,st.cv_signed_on,st.active,(select string_agg(s.protocol,', ' order by s.protocol) from delegations d join studies s on s.id=d.study_id where d.staff_id=st.id and (d.end_on is null or d.end_on>=current_date)) as delegated_on from staff st order by st.active desc,st.name`,
  studies: `select s.id,e.protocol,e.sponsor,e.title,e.status,e.target,e.enrolled,e.screening,e.screen_failed,s.ethics_ref,s.consent_version from v_enrolment e join studies s on s.id=e.study_id order by case e.status when 'enrolling' then 1 when 'follow-up' then 2 when 'startup' then 3 when 'feasibility' then 4 else 5 end,e.protocol`,
  participants: `select p.id,s.protocol,p.subject_number,p.initials,p.status,p.referral_source,p.consented_on,p.consent_version,p.baseline_on,c.name as coordinator from participants p join studies s on s.id=p.study_id left join staff c on c.id=p.coordinator_id order by s.protocol,p.subject_number`,
  schedule: `select id,protocol,subject_number,visit,state,window_opens,window_closes,scheduled_on,coordinator from v_visits where state in ('overdue','window open','upcoming') and participant_status in ('enrolled','screening') and coalesce(window_opens,scheduled_on)<=current_date+14 order by case state when 'overdue' then 1 when 'window open' then 2 else 3 end,window_closes nulls last`,
  enrolment: `select protocol,sponsor,status,target,enrolled,should_have_by_now,screening,screen_failed,prescreen,enrolment_closes_on from v_enrolment where status in ('enrolling','startup','feasibility') order by protocol`,
  receivables: `select state,protocol,sponsor,description,round(amount_cents/100.0) as amount,currency,since,days from v_receivables order by case state when 'overdue' then 1 when 'not invoiced' then 2 else 3 end,days desc`,
  invoices: `select i.id,s.protocol,i.number,i.issued_on,i.due_on,i.paid_on,round(i.amount_cents/100.0) as amount,s.currency,case when i.paid_on is not null then 'paid' when i.due_on<current_date then 'overdue' else 'open' end as state from invoices i join studies s on s.id=i.study_id order by i.issued_on desc`,
  binder: `select b.id,coalesce(s.protocol,'site') as protocol,b.kind,b.version,st.name as staff,b.approved_on,b.expires_on,case when b.expires_on<current_date then 'expired' when b.expires_on<=current_date+30 then 'expiring' else '' end as state,b.location from binder b left join studies s on s.id=b.study_id left join staff st on st.id=b.staff_id order by b.expires_on nulls last,protocol,b.kind`,
  delegation: `select d.id,s.protocol,st.name as staff,st.role,d.tasks,d.start_on,d.end_on,d.pi_signed_on,st.gcp_trained_on from delegations d join studies s on s.id=d.study_id join staff st on st.id=d.staff_id order by s.protocol,d.start_on,st.name`,
  safety: `select ae.id,s.protocol,p.subject_number,ae.description,ae.serious,ae.onset_on,to_char(ae.aware_at,'YYYY-MM-DD HH24:MI') as aware_at,to_char(ae.reported_at,'YYYY-MM-DD HH24:MI') as reported_at,
    case when ae.reported_at is not null then round(extract(epoch from (ae.reported_at-ae.aware_at))/3600)::int end as hours_to_report,ae.outcome
    from adverse_events ae join participants p on p.id=ae.participant_id join studies s on s.id=p.study_id order by ae.aware_at desc`,
  deviations: `select d.id,s.protocol,p.subject_number,d.occurred_on,d.description,d.reported_on from deviations d join studies s on s.id=d.study_id left join participants p on p.id=d.participant_id order by d.occurred_on desc`,
  compliance: `select rule,protocol,record,finding,due_date,source from v_compliance order by rule,protocol,record`,
};

async function studyRead(db, cmd, study) {
  const rows = await db.query(reads[cmd]);
  return study ? rows.filter((r) => !('protocol' in r) || r.protocol === study.protocol) : rows;
}

export async function execute(db, args) {
  const { pos, flags: f } = parseArgs(args);
  const [cmd = 'help', sub, ...rest] = pos;
  if (cmd === 'help' || f.help) return {
    commands: ['studies', 'sponsors', 'staff', 'participants', 'schedule', 'enrolment', 'receivables', 'invoices', 'binder', 'delegation', 'safety', 'deviations', 'compliance', 'attention',
      'study <protocol>', 'participant <subject>', 'insights [1..10]',
      'show <kind> <name|id>', 'add <kind> --field=value', 'update <kind> <name|id> --field=value',
      'enrol <subject> --baseline=YYYY-MM-DD', 'consent <subject> --version=v3.0 [--on=date]', 'screen-fail <subject> --reason=... [--fee=dollars]',
      'complete <subject> <visit> --by=<staff> [--on=date]', 'miss <subject> <visit> [--reason=...]',
      'sae <subject> "<description>" [--aware-at="YYYY-MM-DD HH:MM"] [--not-serious]', 'sae-reported <event> [--at="YYYY-MM-DD HH:MM"]',
      'deviation <subject> "<description>" [--visit=V3] [--on=date]', 'invoice <protocol> [--on=date]', 'paid <invoice> [--on=date]',
      'log <protocol> <note> [--participant=...]', 'import crio --kind=subjects|visits --study=<protocol> --file=report.csv [--dry-run]', 'export --out=backup.json',
      'weekly-review', 'draft-reminder <subject>', 'draft-chaser <invoice>', 'draft-progress-report <protocol>'],
    note: 'Reads accept --study=<protocol> and --json. Money flags (--fee, --amount) are dollars; *_cents fields are cents. Reference fields accept names or ids. Drafts go to drafts/ and are never sent.',
  };
  const study = f.study && cmd !== 'import' ? await resolve(db, 'studies', f.study) : null;

  if (reads[cmd]) return studyRead(db, cmd, study);

  if (cmd === 'attention') {
    const rows = await db.query(`select * from v_attention order by case item when 'SAE CLOCK' then 1 when 'VISIT OVERDUE' then 2 when 'VISIT DUE' then 3 when 'INVOICE OVERDUE' then 4 when 'NOT INVOICED' then 5 else 6 end,due_date`);
    return study ? rows.filter((r) => r.protocol === study.protocol) : rows;
  }

  if (cmd === 'study') {
    const s = await resolve(db, 'studies', sub);
    return {
      study: (await db.query(`select e.protocol,e.sponsor,e.title,s.phase,e.status,pi.name as principal_investigator,s.ethics_ref,s.ethics_approved_on,s.last_progress_report_on,s.consent_version,e.target,e.enrolled,e.should_have_by_now,e.screening,e.screen_failed,s.enrolment_closes_on,s.currency
        from v_enrolment e join studies s on s.id=e.study_id left join staff pi on pi.id=s.pi_id where s.id=$1`, [s.id]))[0],
      schedule_of_assessments: await db.query(`select code,name,day,'-'||window_before||' / +'||window_after as window_days,round(fee_cents/100.0) as fee from visit_templates where study_id=$1 order by seq`, [s.id]),
      participants: await db.query(`select p.subject_number,p.status,p.consent_version,p.baseline_on,(select visit||' ('||state||')' from v_visits v where v.participant_id=p.id and v.state in ('overdue','window open','upcoming') order by v.seq limit 1) as next_visit from participants p where p.study_id=$1 order by p.subject_number`, [s.id]),
      money: await db.query(`select state,count(*)::int as items,round(sum(amount_cents)/100.0) as amount,currency from v_receivables where protocol=$1 group by state,currency`, [s.protocol]),
      findings: await db.query(`select rule,record,finding from v_compliance where protocol=$1 order by rule`, [s.protocol]),
    };
  }

  if (cmd === 'participant') {
    const p = await resolve(db, 'participants', sub);
    return {
      participant: (await db.query(`select s.protocol,p.subject_number,p.initials,p.status,p.referral_source,p.consented_on,p.consent_version,s.consent_version as current_consent_version,p.baseline_on,p.ended_on,p.end_reason,c.name as coordinator
        from participants p join studies s on s.id=p.study_id left join staff c on c.id=p.coordinator_id where p.id=$1`, [p.id]))[0],
      visits: await db.query(`select visit,state,window_opens,window_closes,completed_on,performed_by from v_visits where participant_id=$1 order by seq nulls last,scheduled_on`, [p.id]),
      adverse_events: await db.query(`select description,serious,onset_on,to_char(aware_at,'YYYY-MM-DD HH24:MI') as aware_at,to_char(reported_at,'YYYY-MM-DD HH24:MI') as reported_at,outcome from adverse_events where participant_id=$1 order by aware_at`, [p.id]),
      deviations: await db.query(`select occurred_on,description,reported_on from deviations where participant_id=$1 order by occurred_on`, [p.id]),
      notes: await db.query(`select title,body,created_at from notes where participant_id=$1 order by created_at`, [p.id]),
    };
  }

  if (cmd === 'insights') {
    if (sub !== undefined && !/^([1-9]|10)$/.test(sub)) throw Error('Choose insight 1 through 10');
    const out = [];
    for (let i = 0; i < insightQueries.length; i++) {
      if (sub && Number(sub) !== i + 1) continue;
      const [question, sql] = insightQueries[i];
      let rows = await db.query(sql);
      if (study) rows = rows.filter((r) => !('protocol' in r) || r.protocol === study.protocol);
      out.push({ number: i + 1, question, rows });
    }
    return out;
  }

  if (cmd === 'show') return resolve(db, entity(sub), rest[0]);

  if (cmd === 'add' || cmd === 'update') {
    const kind = entity(sub);
    const old = cmd === 'update' ? await resolve(db, kind, rest[0]) : null;
    const values = {};
    for (const [key, v] of Object.entries(f)) {
      if (['json', 'study'].includes(key)) continue;
      if (dollarFlags[key] && entities[kind].includes(dollarFlags[key])) { values[dollarFlags[key]] = cents(v); continue; }
      if (!entities[kind].includes(key)) throw Error(`Unknown field ${key} for ${kind}`);
      values[key] = v === 'null' ? null : v === true ? 'true' : v;
    }
    if (study && entities[kind].includes('study_id') && !values.study_id) values.study_id = study.id;
    for (const [key, target] of Object.entries(refs)) if (values[key] && entities[kind].includes(key)) values[key] = (await resolve(db, target, values[key])).id;
    const keys = Object.keys(values);
    if (!keys.length) throw Error('Supply at least one field');
    const params = Object.values(values);
    const sql = cmd === 'add'
      ? `insert into ${kind} (${keys.join(',')}) values (${keys.map((_, i) => '$' + (i + 1)).join(',')}) returning *`
      : `update ${kind} set ${keys.map((k, i) => `${k}=$${i + 1}`).join(',')} where id=$${params.push(old.id)} returning *`;
    return (await db.query(sql, params))[0];
  }

  // Randomisation or day 1: set the baseline and lay out every scheduled visit from the study's schedule.
  if (cmd === 'enrol') {
    const p = await resolve(db, 'participants', sub);
    const baseline = need(toDate(f.baseline, '--baseline'), 'Specify --baseline=YYYY-MM-DD (randomisation or day 1)');
    if (!p.consented_on) throw Error(`${p.subject_number} has no consent date. Record consent first.`);
    await db.exec('BEGIN');
    try {
      const updated = (await db.query(`update participants set status='enrolled',baseline_on=$1 where id=$2 returning *`, [baseline, p.id]))[0];
      const added = await db.query(`insert into visits (participant_id,template_id,name) select $1,t.id,t.name from visit_templates t where t.study_id=$2
        and not exists (select 1 from visits v where v.participant_id=$1 and v.template_id=t.id) order by t.seq returning name`, [p.id, p.study_id]);
      await db.exec('COMMIT');
      return { participant: updated.subject_number, baseline_on: baseline, visits_added: added.map((r) => r.name) };
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
  }

  if (cmd === 'consent') {
    const p = await resolve(db, 'participants', sub);
    const version = need(f.version, 'Specify --version= (the consent form version signed)');
    const on = toDate(f.on || today(), '--on');
    const status = p.status === 'prescreen' ? 'screening' : p.status;
    return (await db.query(`update participants set consented_on=case when consented_on is null then $1::date else consented_on end,consent_version=$2,status=$3 where id=$4 returning subject_number,status,consented_on,consent_version`, [on, version, status, p.id]))[0];
  }

  if (cmd === 'screen-fail') {
    const p = await resolve(db, 'participants', sub);
    const reason = need(f.reason, 'Specify --reason= (the inclusion or exclusion criterion)');
    const on = toDate(f.on || today(), '--on');
    await db.exec('BEGIN');
    try {
      const updated = (await db.query(`update participants set status='screen-failed',ended_on=$1,end_reason=$2 where id=$3 returning subject_number,status,ended_on,end_reason`, [on, reason, p.id]))[0];
      await db.query(`delete from charges where visit_id in (select id from visits where participant_id=$1) and invoice_id is null`, [p.id]);
      const fee = cents(f.fee);
      if (fee) await db.query(`insert into charges (study_id,kind,description,amount_cents,earned_on) values ($1,'screen-fail',$2,$3,$4)`, [p.study_id, `${p.subject_number} screen failure`, fee, on]);
      await db.exec('COMMIT');
      return { ...updated, screen_fail_fee: fee ? fee / 100 : null };
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
  }

  if (cmd === 'complete') {
    const { participant: p, visit: v } = await resolveVisit(db, sub, rest[0]);
    if (v.status === 'completed') throw Error(`${p.subject_number} ${v.name} is already completed on ${v.completed_on}`);
    const by = await resolve(db, 'staff', need(f.by, 'Specify --by= (who performed the visit)'));
    const on = toDate(f.on || today(), '--on');
    if (on > today()) throw Error(`${on} is in the future. Record a visit once it has happened.`);
    await db.exec('BEGIN');
    try {
      await db.query(`update visits set status='completed',completed_on=$1,performed_by=$2 where id=$3`, [on, by.id, v.id]);
      if (v.fee_cents > 0 && p.status !== 'screen-failed') {
        await db.query(`insert into charges (study_id,visit_id,kind,description,amount_cents,earned_on) values ($1,$2,'visit',$3,$4,$5) on conflict (visit_id) do nothing`,
          [p.study_id, v.id, `${p.subject_number} ${v.name}`, v.fee_cents, on]);
      }
      await db.exec('COMMIT');
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
    const after = (await db.query(`select protocol,subject_number,visit,state,window_opens,window_closes,completed_on,performed_by,round(fee_cents/100.0) as fee_earned from v_visits where id=$1`, [v.id]))[0];
    const flags = (await db.query(`select rule,finding from v_compliance where record=$1`, [`${p.subject_number} ${v.name}`]));
    return { visit: after, findings: flags };
  }

  if (cmd === 'miss') {
    const { participant: p, visit: v } = await resolveVisit(db, sub, rest[0]);
    await db.exec('BEGIN');
    try {
      await db.query(`update visits set status='missed',note=$1 where id=$2`, [f.reason || null, v.id]);
      await db.query(`insert into deviations (study_id,participant_id,visit_id,occurred_on,description) values ($1,$2,$3,$4,$5)`,
        [p.study_id, p.id, v.id, toDate(f.on || today(), '--on'), `Missed visit: ${v.name}${f.reason ? `. ${f.reason}` : ''}`]);
      await db.exec('COMMIT');
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
    return { participant: p.subject_number, visit: v.name, status: 'missed', deviation_recorded: true };
  }

  if (cmd === 'sae') {
    const p = await resolve(db, 'participants', sub);
    const description = need(rest.join(' '), 'Describe the event');
    const aware = f['aware-at'] ? String(f['aware-at']).replace(' ', 'T') : new Date().toISOString();
    if (Number.isNaN(Date.parse(aware))) throw Error(`--aware-at: "${f['aware-at']}" is not a date and time`);
    const row = (await db.query(`insert into adverse_events (participant_id,description,serious,onset_on,aware_at) values ($1,$2,$3,$4,$5) returning *`,
      [p.id, description, !f['not-serious'], toDate(f.onset || null, '--onset'), aware]))[0];
    const hours = (await db.query('select settings.sae_report_hours as h from settings'))[0].h;
    return { event: row.description, serious: row.serious, aware_at: row.aware_at, report_to_sponsor_by: row.serious ? new Date(new Date(row.aware_at).getTime() + hours * 3600e3).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : null };
  }

  if (cmd === 'sae-reported') {
    const e = await resolve(db, 'adverse_events', sub);
    const at = f.at ? String(f.at).replace(' ', 'T') : new Date().toISOString();
    if (Number.isNaN(Date.parse(at))) throw Error(`--at: "${f.at}" is not a date and time`);
    const row = (await db.query(`update adverse_events set reported_at=$1 where id=$2 returning description,aware_at,reported_at,round(extract(epoch from (reported_at-aware_at))/3600)::int as hours_to_report`, [at, e.id]))[0];
    return row;
  }

  if (cmd === 'deviation') {
    const p = await resolve(db, 'participants', sub);
    const v = f.visit ? (await resolveVisit(db, p.subject_number, f.visit)).visit : null;
    return (await db.query(`insert into deviations (study_id,participant_id,visit_id,occurred_on,description,reported_on) values ($1,$2,$3,$4,$5,$6) returning *`,
      [p.study_id, p.id, v?.id || null, toDate(f.on || v?.completed_on || today(), '--on'), need(rest.join(' '), 'Describe the deviation'), f.reported ? toDate(f.reported, '--reported') : null]))[0];
  }

  // Raise one invoice for everything earned and not yet invoiced on a study. A record, not a send.
  if (cmd === 'invoice') {
    const s = await resolve(db, 'studies', sub);
    const sp = (await db.query('select * from sponsors where id=$1', [s.sponsor_id]))[0];
    const on = toDate(f.on || today(), '--on');
    await db.exec('BEGIN');
    try {
      const lines = await db.query(`select id,description,amount_cents,earned_on from charges where study_id=$1 and invoice_id is null and earned_on<=$2 order by earned_on`, [s.id, on]);
      if (!lines.length) throw Error(`Nothing earned and not invoiced on ${s.protocol}`);
      const n = Number((await db.query(`select count(*) as n from invoices where study_id=$1`, [s.id]))[0].n) + 1;
      let number = `${s.protocol.replace(/[^A-Za-z0-9]/g, '')}-${String(n).padStart(4, '0')}`;
      while ((await db.query('select 1 from invoices where number=$1', [number])).length) number = `${number}a`;
      const total = lines.reduce((t, l) => t + Number(l.amount_cents), 0);
      const inv = (await db.query(`insert into invoices (study_id,number,issued_on,due_on,amount_cents) values ($1,$2,$3,$3::date+$4::int,$5) returning *`, [s.id, number, on, sp.payment_terms_days, total]))[0];
      await db.query(`update charges set invoice_id=$1 where id = any($2::uuid[])`, [inv.id, lines.map((l) => l.id)]);
      await db.exec('COMMIT');
      return { invoice: inv.number, sponsor: sp.name, issued_on: inv.issued_on, due_on: inv.due_on, total: money(total, s.currency), lines: lines.map((l) => ({ description: l.description, earned_on: l.earned_on, amount: money(l.amount_cents, s.currency) })), sent: false };
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
  }

  if (cmd === 'paid') {
    const i = await resolve(db, 'invoices', sub);
    if (i.paid_on) throw Error(`${i.number} is already paid on ${i.paid_on}`);
    return (await db.query('update invoices set paid_on=$1 where id=$2 returning number,issued_on,due_on,paid_on,paid_on-issued_on as days_to_pay', [toDate(f.on || today(), '--on'), i.id]))[0];
  }

  if (cmd === 'log') {
    const s = await resolve(db, 'studies', sub);
    const p = f.participant ? (await resolve(db, 'participants', f.participant)).id : null;
    return (await db.query('insert into notes (study_id,participant_id,title,body) values ($1,$2,$3,$4) returning *', [s.id, p, f.title || 'Note', need(rest.join(' '), 'Supply the note text')]))[0];
  }

  if (cmd === 'import') return importCrio(db, sub, f);

  if (cmd === 'export') {
    const snapshot = { format: 'trial-site-for-claude-code/v1', exported_at: new Date().toISOString(), records: {} };
    await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
      for (const kind of [...Object.keys(entities), 'visits', 'settings']) snapshot.records[kind] = await db.query(`select * from ${kind} order by 1`);
      await db.exec('COMMIT');
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
    const out = path.resolve(need(f.out, 'Specify --out=backup.json'));
    fs.writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return { file: out, counts: Object.fromEntries(Object.entries(snapshot.records).map(([k, v]) => [k, v.length])) };
  }

  if (cmd === 'weekly-review') {
    const data = { attention: await execute(db, ['attention']), enrolment: await execute(db, ['enrolment']), compliance: await execute(db, ['compliance']) };
    const site = (await db.query('select site_name from settings'))[0].site_name;
    const sae = data.attention.filter((r) => r.item === 'SAE CLOCK').length;
    const overdue = data.attention.filter((r) => r.item === 'VISIT OVERDUE').length;
    const lead = sae ? `${sae} serious adverse event(s) not yet reported to the sponsor. That comes first.` : overdue ? `${overdue} visit(s) past their window.` : 'No safety clocks running and no visits past their window.';
    return draft('weekly-review', `# ${site}: weekly review, ${today()}\n\n${lead}\n\n## Needs someone this week\n\n${human(data.attention)}\n\n## Enrolment\n\n${human(data.enrolment)}\n\n## Record checks\n\n${human(data.compliance.map(({ source, ...r }) => r))}\n\nSources for each rule: docs/compliance.md. Draft only, nothing has been sent.\n`, data);
  }

  if (cmd === 'draft-reminder') {
    const p = await resolve(db, 'participants', sub);
    const next = (await db.query(`select v.*,s.title from v_visits v join studies s on s.id=v.study_id where v.participant_id=$1 and v.state in ('overdue','window open','upcoming') order by v.seq limit 1`, [p.id]))[0];
    if (!next) throw Error(`${p.subject_number} has no visit coming up`);
    const site = (await db.query('select site_name from settings'))[0].site_name;
    const text = `# Draft only: visit reminder for ${p.subject_number}\n\nTo: ${p.initials || p.subject_number}${p.phone ? ` (${p.phone})` : ''}\n\nHi, this is ${site}. Your next study visit (${next.visit}) is due between ${next.window_opens} and ${next.window_closes}.${next.state === 'overdue' ? ' It is now past that window, so please call us today so we can see you as soon as possible.' : ' Please reply or call us to confirm a time.'}\n\nThank you for taking part.\n\nNothing has been sent. Use the participant's preferred contact method and your approved wording.\n`;
    return draft('visit-reminder', text, { participant: p.subject_number, visit: next });
  }

  if (cmd === 'draft-chaser') {
    const i = await resolve(db, 'invoices', sub);
    if (i.paid_on) throw Error(`${i.number} was paid on ${i.paid_on}`);
    const s = (await db.query('select * from studies where id=$1', [i.study_id]))[0];
    const sp = (await db.query('select * from sponsors where id=$1', [s.sponsor_id]))[0];
    const site = (await db.query('select site_name from settings'))[0].site_name;
    const lines = await db.query('select description,amount_cents,earned_on from charges where invoice_id=$1 order by earned_on', [i.id]);
    const text = `# Draft only: payment follow-up\n\nTo: ${sp.contact_name || sp.name}${sp.email ? ` <${sp.email}>` : ''}\nSubject: ${s.protocol}: invoice ${i.number} due ${i.due_on}\n\nHi ${(sp.contact_name || '').split(' ')[0] || 'there'},\n\nInvoice ${i.number} for ${s.protocol} (${money(i.amount_cents, s.currency)}) was due on ${i.due_on}. Could you confirm when it will be paid, or let us know if anything is holding it up?\n\n${lines.map((l) => `- ${l.description}, ${l.earned_on}: ${money(l.amount_cents, s.currency)}`).join('\n')}\n\nThanks,\n${site}\n\nNothing has been sent. Review before use.\n`;
    return draft('payment-chaser', text, { invoice: i, lines });
  }

  if (cmd === 'draft-progress-report') {
    const s = await resolve(db, 'studies', sub);
    const st = await execute(db, ['study', s.protocol]);
    const ae = await db.query(`select count(*) filter (where serious)::int as serious,count(*)::int as total from adverse_events a join participants p on p.id=a.participant_id where p.study_id=$1`, [s.id]);
    const dev = await db.query('select count(*)::int as n from deviations where study_id=$1', [s.id]);
    const text = `# Draft only: annual progress report to the ethics committee\n\nStudy: ${s.protocol}, ${s.title}\nEthics reference: ${s.ethics_ref || '(not recorded)'}\nApproved: ${s.ethics_approved_on || '(not recorded)'}. Last report: ${s.last_progress_report_on || 'none'}\nPrincipal investigator: ${st.study.principal_investigator || '(not recorded)'}\n\n## Progress to date\n\nStatus: ${s.status}. Enrolled ${st.study.enrolled} of a target of ${st.study.target ?? '(not set)'}; ${st.study.screening} in screening; ${st.study.screen_failed} screen failures.\n\n## Safety\n\n${ae[0].total} adverse events recorded at this site, ${ae[0].serious} serious.\n\n## Compliance with the approved protocol\n\n${dev[0].n} protocol deviations recorded.\n${st.findings.length ? `\nOpen record checks:\n\n${human(st.findings)}\n` : ''}\n## Records\n\nCurrent consent form version: ${s.consent_version || '(not recorded)'}. Records are held in the site file and this database.\n\nComplete the committee's own form with these figures. Nothing has been submitted. Record the submission with: update studies ${s.protocol} --last_progress_report_on=YYYY-MM-DD\n`;
    return draft('progress-report', text, st);
  }

  throw Error(`Unknown command ${cmd}. Run help.`);
}

function draft(prefix, text, data) {
  const dir = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${prefix}-${today()}-${Math.random().toString(16).slice(2, 8)}.md`);
  fs.writeFileSync(file, text, { flag: 'wx', mode: 0o600 });
  return { file, data, sent: false };
}

const hidden = (k) => ['id', 'created_at', 'updated_at', 'study_id', 'participant_id'].includes(k) || k.endsWith('_id');
export function human(value) {
  if (Array.isArray(value)) {
    if (!value.length) return '  (none)';
    if (typeof value[0] !== 'object' || value[0] === null) return value.map((v) => `  ${v}`).join('\n');
    if (value[0]?.question) return value.map((x) => `${x.number}. ${x.question}\n${human(x.rows)}`).join('\n\n');
    const keys = Object.keys(value[0]).filter((k) => !hidden(k));
    return table(value, keys.map((key) => ({ key, label: key.replaceAll('_', ' '), width: 70, format: (v) => (v instanceof Date ? v.toISOString().slice(0, 16) : v == null ? '' : String(v)) })));
  }
  if (value && typeof value === 'object') {
    const flat = (v) => v === null || typeof v !== 'object' || v instanceof Date;
    const scalars = Object.entries(value).filter(([k, v]) => flat(v) && !hidden(k)).map(([k, v]) => `${k.replaceAll('_', ' ')}: ${v instanceof Date ? v.toISOString().slice(0, 16) : v ?? ''}`);
    const nested = Object.entries(value).filter(([, v]) => !flat(v)).map(([k, v]) => `${k.replaceAll('_', ' ')}:\n${human(v)}`);
    return [scalars.join('\n'), ...nested].filter(Boolean).join('\n\n');
  }
  return String(value ?? '');
}

// CRIO reports (standard or built in its report tool) downloaded as CSV. CRIO does not publish its column
// names, so the import reads the common labels below; docs/replace-crio.md says how to add your own.
export const COLUMNS = {
  subject: ['Subject ID', 'Subject Number', 'Subject', 'Patient ID', 'Screening Number', 'Subject #'],
  initials: ['Initials', 'Subject Initials', 'Patient Initials'],
  status: ['Subject Status', 'Status', 'Patient Status'],
  consented: ['Consent Date', 'Informed Consent Date', 'ICF Date', 'Date Consented', 'ICF Signed Date'],
  consent_version: ['ICF Version', 'Consent Version', 'Consent Form Version'],
  baseline: ['Randomization Date', 'Randomisation Date', 'Enrollment Date', 'Enrolment Date', 'Baseline Date', 'Day 1', 'Day 1 Date'],
  ended: ['End Date', 'Withdrawal Date', 'Screen Fail Date', 'Completion Date', 'Discontinuation Date'],
  end_reason: ['Screen Fail Reason', 'Withdrawal Reason', 'Discontinuation Reason', 'End Reason'],
  referral: ['Referral Source', 'Recruitment Source', 'Lead Source', 'Source'],
  coordinator: ['Coordinator', 'Primary Coordinator', 'Study Coordinator', 'CRC'],
  phone: ['Phone', 'Mobile', 'Phone Number'],
  visit: ['Visit Name', 'Visit', 'Visit Type'],
  visit_date: ['Visit Date', 'Completed Date', 'Date of Visit', 'Actual Date'],
  scheduled: ['Scheduled Date', 'Appointment Date', 'Target Date'],
  visit_status: ['Visit Status', 'Appointment Status', 'Status'],
  performed_by: ['Performed By', 'Investigator', 'Staff', 'Completed By', 'Coordinator'],
};
const SUBJECT_STATUS = { prescreen: 'prescreen', prescreening: 'prescreen', 'pre-screen': 'prescreen', 'pre-screening': 'prescreen', lead: 'prescreen', screening: 'screening', 'in screening': 'screening',
  enrolled: 'enrolled', enrollment: 'enrolled', randomized: 'enrolled', randomised: 'enrolled', active: 'enrolled', 'on treatment': 'enrolled', 'follow up': 'enrolled', 'follow-up': 'enrolled',
  'screen fail': 'screen-failed', 'screen failed': 'screen-failed', 'screen failure': 'screen-failed', completed: 'completed', complete: 'completed',
  withdrawn: 'withdrawn', discontinued: 'withdrawn', 'early termination': 'withdrawn', 'lost to follow-up': 'withdrawn', 'lost to follow up': 'withdrawn' };
const VISIT_STATUS = { completed: 'completed', complete: 'completed', done: 'completed', attended: 'completed', scheduled: 'scheduled', booked: 'scheduled', pending: 'scheduled',
  missed: 'missed', 'no show': 'missed', 'no-show': 'missed', cancelled: 'cancelled', canceled: 'cancelled' };

async function importCrio(db, vendor, f) {
  if (vendor !== 'crio') throw Error('Supported import: crio');
  const s = await resolve(db, 'studies', need(f.study, 'Import needs --study=<protocol>. Add the study and its visit schedule first.'));
  const kind = f.kind || 'subjects';
  if (!['subjects', 'visits'].includes(kind)) throw Error('Import kind must be subjects or visits');
  const file = need(f.file, 'Specify --file=report.csv');
  if (!String(file).toLowerCase().endsWith('.csv')) throw Error('Download the CRIO report as CSV (or save it from Excel as CSV) first. Read docs/replace-crio.md.');
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  if (!rows.length) throw Error('CSV has no data rows');
  const get = (row, col) => pick(row, ...COLUMNS[col]).trim();
  const counts = { rows: rows.length, created: 0, updated: 0, unscheduled_visits: 0, charges: 0 };
  const staffId = async (name) => {
    if (!name) return null;
    const hit = await db.query('select id from staff where lower(name)=lower($1)', [name]);
    if (hit.length) return hit[0].id;
    const made = (await db.query(`insert into staff (name,role) values ($1,'other') returning id`, [name]))[0];
    counts.staff_added = (counts.staff_added || 0) + 1;
    return made.id;
  };
  await db.exec('BEGIN');
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i], where = `Row ${i + 2}`;
      const subject = need(get(row, 'subject'), `${where}: Subject ID required`);
      if (kind === 'subjects') {
        const raw = get(row, 'status').toLowerCase();
        const status = raw ? SUBJECT_STATUS[raw] : 'screening';
        if (!status) throw Error(`${where}: unknown subject status "${get(row, 'status')}". Add it to SUBJECT_STATUS in scripts/trial.mjs or ask /customise.`);
        const existing = (await db.query('select id from participants where study_id=$1 and subject_number=$2', [s.id, subject]))[0];
        await db.query(`insert into participants (study_id,subject_number,initials,status,referral_source,phone,consented_on,consent_version,baseline_on,ended_on,end_reason,coordinator_id,external_id)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$2)
          on conflict (study_id,subject_number) do update set initials=coalesce(excluded.initials,participants.initials),status=excluded.status,referral_source=coalesce(excluded.referral_source,participants.referral_source),
            phone=coalesce(excluded.phone,participants.phone),consented_on=coalesce(excluded.consented_on,participants.consented_on),consent_version=coalesce(excluded.consent_version,participants.consent_version),
            baseline_on=coalesce(excluded.baseline_on,participants.baseline_on),ended_on=coalesce(excluded.ended_on,participants.ended_on),end_reason=coalesce(excluded.end_reason,participants.end_reason),
            coordinator_id=coalesce(excluded.coordinator_id,participants.coordinator_id)`,
          [s.id, subject, get(row, 'initials') || null, status, get(row, 'referral') || null, get(row, 'phone') || null, toDate(get(row, 'consented'), where), get(row, 'consent_version') || null,
            toDate(get(row, 'baseline'), where), toDate(get(row, 'ended'), where), get(row, 'end_reason') || null, await staffId(get(row, 'coordinator'))]);
        counts[existing ? 'updated' : 'created']++;
      } else {
        const p = (await db.query('select * from participants where study_id=$1 and subject_number=$2', [s.id, subject]))[0];
        if (!p) throw Error(`${where}: subject ${subject} is not in ${s.protocol}. Import subjects first.`);
        const name = need(get(row, 'visit'), `${where}: Visit Name required`);
        const t = (await db.query('select * from visit_templates where study_id=$1 and (lower(code)=lower($2) or lower(name)=lower($2))', [s.id, name]))[0];
        const date = toDate(get(row, 'visit_date'), where);
        const rawStatus = get(row, 'visit_status').toLowerCase();
        const status = rawStatus ? VISIT_STATUS[rawStatus] : (date ? 'completed' : 'scheduled');
        if (!status) throw Error(`${where}: unknown visit status "${get(row, 'visit_status')}"`);
        const by = await staffId(get(row, 'performed_by'));
        const existing = t
          ? (await db.query('select id from visits where participant_id=$1 and template_id=$2', [p.id, t.id]))[0]
          : (await db.query('select id from visits where participant_id=$1 and template_id is null and lower(name)=lower($2) and scheduled_on is not distinct from $3', [p.id, name, toDate(get(row, 'scheduled'), where) || date]))[0];
        let visitId;
        if (existing) {
          await db.query('update visits set completed_on=$1,status=$2,performed_by=coalesce($3,performed_by),scheduled_on=coalesce($4,scheduled_on) where id=$5',
            [status === 'completed' ? date : null, status, by, toDate(get(row, 'scheduled'), where), existing.id]);
          visitId = existing.id; counts.updated++;
        } else {
          visitId = (await db.query('insert into visits (participant_id,template_id,name,scheduled_on,completed_on,status,performed_by) values ($1,$2,$3,$4,$5,$6,$7) returning id',
            [p.id, t?.id || null, t?.name || name, toDate(get(row, 'scheduled'), where) || (t ? null : date), status === 'completed' ? date : null, status, by]))[0].id;
          counts.created++;
          if (!t) counts.unscheduled_visits++;
        }
        if (status === 'completed' && t?.fee_cents > 0 && p.status !== 'screen-failed') {
          const made = await db.query(`insert into charges (study_id,visit_id,kind,description,amount_cents,earned_on) values ($1,$2,'visit',$3,$4,$5) on conflict (visit_id) do nothing returning id`,
            [s.id, visitId, `${p.subject_number} ${t.name}`, t.fee_cents, date]);
          counts.charges += made.length;
        }
      }
    }
    await db.exec(f['dry-run'] ? 'ROLLBACK' : 'COMMIT');
  } catch (e) { await db.exec('ROLLBACK'); throw e; }
  return { kind, study: s.protocol, ...counts, dry_run: Boolean(f['dry-run']) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let db;
  const args = process.argv.slice(2), json = args.includes('--json');
  try { db = await getDb(); const out = await execute(db, args); console.log(json ? JSON.stringify(out, null, 2) : human(out)); }
  catch (e) { if (json) console.log(JSON.stringify({ error: e.message, ...(e.matches ? { matches: e.matches } : {}) })); else console.error(e.message); process.exitCode = 1; }
  finally { await db?.close(); }
}
