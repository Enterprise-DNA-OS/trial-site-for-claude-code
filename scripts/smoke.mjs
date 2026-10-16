// npm test: a temporary embedded database (or an isolated schema on TEST_DATABASE_URL),
// migrate, seed twice, then every command, rule boundary, import, draft, document and view.
// Never touches your data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { execute, human } from './trial.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-site-smoke-'));
const postgresUrl = process.env.TEST_DATABASE_URL || '';
let control, schema;
if (postgresUrl) {
  const { default: pg } = await import('pg');
  control = new pg.Client({ connectionString: postgresUrl }); await control.connect();
  schema = 'trial_test_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8);
  await control.query(`create schema ${schema}`);
  process.env.PGOPTIONS = `-c search_path=${schema},public`;
}
process.env.DATABASE_URL = postgresUrl; process.env.DATA_DIR = path.join(temp, 'db'); process.env.OUTPUT_DIR = temp;
const db = await getDb();
let checks = 0;
const run = (...args) => execute(db, args);
const ok = (condition, message) => { assert.ok(condition, message); console.log(`ok ${++checks}: ${message}`); };
const fail = async (args, pattern) => { await assert.rejects(() => run(...args), pattern); ok(true, `Rejects: ${args.slice(0, 3).join(' ')} (${pattern.source})`); };
const count = async (t, where = 'true') => Number((await db.query(`select count(*) as n from ${t} where ${where}`))[0].n);
const findings = async (rule) => (await run('compliance')).filter((x) => x.rule === rule);
const attention = async (item) => (await run('attention')).filter((x) => x.item === item);

try {
  ok((await migrate(db)).ran.length === 1, 'Migration applies');
  ok((await migrate(db)).ran.length === 0, 'Migration is idempotent');
  await seed(db); await seed(db);
  ok((await count('participants')) === 10 && (await count('visits')) === 30 && (await count('charges')) === 22, 'Seed is idempotent');

  // Every read
  for (const c of ['help', 'studies', 'sponsors', 'staff', 'participants', 'schedule', 'enrolment', 'receivables', 'invoices', 'binder', 'delegation', 'safety', 'deviations', 'compliance', 'attention'])
    ok(Boolean(await run(c)), `Read ${c}`);
  ok((await run('participants', '--study=kes-210')).every((r) => r.protocol === 'KES-210'), 'Study filter on reads');
  const mer = await run('study', 'mer-301');
  ok(mer.schedule_of_assessments.length === 7 && mer.participants.length === 7 && mer.findings.length > 0, 'Study detail: schedule, participants, findings');
  const p1 = await run('participant', '301-001');
  ok(p1.visits.some((v) => v.state === 'overdue') && p1.visits.some((v) => v.state === 'out of window'), 'Participant detail shows an overdue and an out-of-window visit');

  // Name matching
  ok((await run('show', 'sponsors', 'KESTREL')).name === 'Kestrel Devices', 'Case-insensitive name match');
  ok((await run('show', 'staff', 'fifita')).name === 'Dr Tom Fifita', 'Name fragment match');
  await fail(['show', 'participants', '301'], /Ambiguous participants/);
  await fail(['show', 'studies', 'nothing-like-this'], /No studies match/);
  await fail(['complete', '301-002', 'week'], /Ambiguous visit/);

  // Attention: one of each kind in the seed
  for (const item of ['SAE CLOCK', 'VISIT OVERDUE', 'VISIT DUE', 'NOT INVOICED', 'INVOICE OVERDUE', 'BINDER EXPIRING', 'ENROLMENT BEHIND'])
    ok((await attention(item)).length > 0, `Attention finds ${item}`);
  ok((await run('attention'))[0].item === 'SAE CLOCK', 'A running safety clock leads the attention list');

  // Every rule has seeded evidence and a source
  const rules = ['SAE-24H', 'GCP-NOT-DELEGATED', 'GCP-TRAINING', 'CONSENT-BEFORE-VISIT', 'CONSENT-VERSION', 'ETHICS-PROGRESS-REPORT', 'BINDER-EXPIRED', 'PROTOCOL-WINDOW', 'RETENTION-15Y'];
  const all = await run('compliance');
  ok(rules.every((r) => all.some((x) => x.rule === r)), 'Every compliance rule has seeded evidence');
  ok(all.every((x) => x.source), 'Every finding carries its source');
  const doc = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'compliance.md'), 'utf8');
  ok(rules.every((r) => doc.includes(`## ${r}`)), 'Every rule is documented in docs/compliance.md');

  // SAE clock: 23 hours unreported is inside, 25 hours is late; reporting at 23 hours clears it
  const ae = (await run('sae', '301-003', 'Anaphylaxis after dose', `--aware-at=${new Date(Date.now() - 23 * 3600e3).toISOString()}`));
  ok(ae.serious === true && ae.report_to_sponsor_by.endsWith('UTC'), 'SAE logged with a report-by time');
  ok(!(await findings('SAE-24H')).some((x) => x.record === '301-003'), 'SAE clock: 23 hours unreported is not yet a finding');
  ok((await attention('SAE CLOCK')).some((x) => x.record === '301-003'), 'SAE clock shows on attention while unreported');
  await db.query(`update adverse_events set aware_at=now()-interval '25 hours' where description='Anaphylaxis after dose'`);
  ok((await findings('SAE-24H')).some((x) => x.record === '301-003'), 'SAE clock: 25 hours unreported is a finding');
  const reported = await run('sae-reported', 'anaphylaxis', `--at=${new Date(Date.now() - 2 * 3600e3).toISOString()}`);
  ok(reported.hours_to_report === 23 && !(await findings('SAE-24H')).some((x) => x.record === '301-003'), 'Reported 23 hours after awareness clears the finding');

  // Visit windows: the first and last days of the window are in, a day either side is out, a deviation clears it
  const w8 = (await db.query(`select window_opens from v_visits where subject_number='301-002' and visit='Week 8'`))[0].window_opens;
  const done = await run('complete', '301-002', 'V3', '--by=Mele Taufa', `--on=${w8}`);
  ok(done.visit.state === 'done' && Number(done.visit.fee_earned) === 1250, 'Visit on the first day of its window is done and earns its fee');
  await fail(['complete', '301-002', 'V3', '--by=Mele Taufa'], /already completed/);
  await fail(['complete', '301-002', 'V4', '--by=Mele Taufa', '--on=2099-01-01'], /in the future/);
  await db.query(`update visits set completed_on=completed_on-1 where id=$1`, [(await db.query(`select id from v_visits where subject_number='301-002' and visit='Week 8'`))[0].id]);
  ok((await findings('PROTOCOL-WINDOW')).some((x) => x.record === '301-002 Week 8'), 'A day before the window opens is out of window');
  const late = await run('complete', '301-001', 'week 16', '--by=Mele');
  ok(late.visit.state === 'out of window' && late.findings.some((x) => x.rule === 'PROTOCOL-WINDOW'), 'Visit the day after its window closed is out of window and flagged');
  await run('deviation', '301-001', 'Week 16 one day late: participant unwell', '--visit=V5');
  ok(!(await findings('PROTOCOL-WINDOW')).some((x) => x.record === '301-001 Week 16'), 'Recording the deviation clears the window finding');
  await db.query(`update visits v set completed_on=x.window_closes from v_visits x where x.id=v.id and x.subject_number='301-001' and x.visit='Week 16'`);
  ok((await db.query(`select state from v_visits where subject_number='301-001' and visit='Week 16'`))[0].state === 'done', 'The last day of the window is inside it');

  // Delegation: a visit by someone not delegated for visits is flagged
  const undelegated = await run('complete', '210-003', 'D90', '--by=Priya Shah');
  ok(undelegated.findings.some((x) => x.rule === 'GCP-NOT-DELEGATED'), 'Visit by staff without a visits delegation is flagged');
  await run('add', 'delegations', '--study_id=KES-210', '--staff_id=Priya', '--tasks=visits, data entry', `--start_on=${new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10)}`);
  ok(!(await findings('GCP-NOT-DELEGATED')).some((x) => x.record === '210-003 Day 90 check'), 'Adding the delegation clears it');

  // Consent: re-consent on the current version clears the version finding
  ok((await findings('CONSENT-VERSION')).some((x) => x.record === '301-005'), 'Old consent version is flagged');
  await run('consent', '301-005', '--version=v3.0');
  ok(!(await findings('CONSENT-VERSION')).some((x) => x.record === '301-005'), 'Re-consent on the current version clears it');

  // Enrol: lays out the schedule; refuses without consent
  await fail(['enrol', '301-006', '--baseline=2026-10-01'], /no consent date/);
  await run('consent', '301-006', '--version=v3.0');
  ok((await run('show', 'participants', '301-006')).status === 'screening', 'Consent moves a prescreen participant to screening');
  const enrolled = await run('enrol', '301-006', `--baseline=${new Date().toISOString().slice(0, 10)}`);
  ok(enrolled.visits_added.length === 7, 'Enrol lays out every visit in the schedule');

  // Screen failure with a fee
  await run('screen-fail', '301-005', '--reason=Eosinophils below inclusion', '--fee=900');
  ok((await count('charges', `description='301-005 screen failure' and amount_cents=90000`)) === 1, 'Screen failure fee is recorded in dollars');
  const sf = (await run('insights', '6'))[0].rows.find((r) => r.protocol === 'MER-301');
  ok(String(sf.no_fee_recorded).includes('301-007'), 'Insight 6 finds the screen failure never charged');

  // Money: invoice everything earned, then nothing is left; paid
  const before = await count('charges', `invoice_id is null and earned_on<=current_date and study_id=(select id from studies where protocol='MER-301')`);
  const inv = await run('invoice', 'MER-301');
  ok(inv.lines.length === before && inv.sent === false, 'Invoice takes every uninvoiced charge on the study and sends nothing');
  ok(!(await attention('NOT INVOICED')).some((x) => x.protocol === 'MER-301'), 'Nothing on MER-301 is left uninvoiced');
  await fail(['invoice', 'MER-301'], /Nothing earned/);
  const paid = await run('paid', 'MER301-0007');
  ok(paid.paid_on && !(await attention('INVOICE OVERDUE')).length, 'Paying the overdue invoice clears it');
  await fail(['paid', 'MER301-0007'], /already paid/);

  // Insights: all ten run
  const insights = await run('insights');
  ok(insights.length === 10 && insights.every((i) => Array.isArray(i.rows)), 'All ten insights run');
  ok(insights[0].rows.some((r) => r.sponsor === 'Meridian Therapeutics'), 'Insight 1 ranks sponsors by days to pay');
  await fail(['insights', '11'], /1 through 10/);

  // Add and update with dollar flags
  const t = await run('add', 'visit_templates', '--study_id=MER-405', '--seq=1', '--code=SCR', '--name=Screening', '--day=-28', '--window_before=7', '--window_after=0', '--fee=1600.50');
  ok(Number(t.fee_cents) === 160050, 'Add takes a fee in dollars');
  ok((await run('update', 'studies', 'MER-405', '--status=enrolling', '--target_enrolment=10')).status === 'enrolling', 'Update a study');
  await fail(['add', 'studies', '--colour=blue'], /Unknown field/);

  // Import from CRIO exports: dry run writes nothing, real run creates, a second run updates
  await run('add', 'studies', '--sponsor_id=Meridian', '--protocol=CRIO-DEMO', '--title=Imported study', '--status=enrolling');
  await run('add', 'visit_templates', '--study_id=CRIO-DEMO', '--seq=1', '--code=SCR', '--name=Screening', '--day=-14', '--window_before=14', '--window_after=13', '--fee=1000');
  await run('add', 'visit_templates', '--study_id=CRIO-DEMO', '--seq=2', '--code=D1', '--name=Day 1', '--day=0', '--fee=2000');
  await run('add', 'visit_templates', '--study_id=CRIO-DEMO', '--seq=3', '--code=W4', '--name=Week 4', '--day=28', '--window_before=3', '--window_after=3', '--fee=900');
  const subjects = path.join(REPO_ROOT, 'examples', 'crio', 'subjects.csv');
  const visits = path.join(REPO_ROOT, 'examples', 'crio', 'visits.csv');
  const dry = await run('import', 'crio', '--kind=subjects', '--study=CRIO-DEMO', `--file=${subjects}`, '--dry-run');
  ok(dry.created === 3 && (await count('participants', `study_id=(select id from studies where protocol='CRIO-DEMO')`)) === 0, 'Import dry run counts and writes nothing');
  const real = await run('import', 'crio', '--kind=subjects', '--study=CRIO-DEMO', `--file=${subjects}`);
  ok(real.created === 3 && real.staff_added === 1, 'Import creates subjects and an unknown coordinator');
  const p401 = await run('show', 'participants', '401-001');
  ok(p401.status === 'enrolled' && p401.baseline_on === '2026-02-17' && p401.consented_on === '2026-02-03', 'Import maps status and DD/MM/YYYY dates');
  ok((await run('import', 'crio', '--kind=subjects', '--study=CRIO-DEMO', `--file=${subjects}`)).updated === 3, 'A second subject import updates, never duplicates');
  const vi = await run('import', 'crio', '--kind=visits', '--study=CRIO-DEMO', `--file=${visits}`);
  ok(vi.created === 5 && vi.unscheduled_visits === 1 && vi.charges === 3, 'Visit import matches the schedule, keeps unscheduled visits and charges completed ones');
  ok((await count('charges', `description like '401-002%'`)) === 0, 'Screen-failed subjects earn no visit fees on import');
  const bad = path.join(temp, 'bad.csv');
  fs.writeFileSync(bad, 'Subject ID,Subject Status\n401-009,Sleeping\n');
  await fail(['import', 'crio', '--kind=subjects', '--study=CRIO-DEMO', `--file=${bad}`], /unknown subject status/);
  await fail(['import', 'crio', '--kind=subjects', '--study=CRIO-DEMO', '--file=subjects.xlsx'], /as CSV/);
  await fail(['import', 'crio', '--kind=subjects', `--file=${subjects}`], /--study/);

  // Export
  const exp = await run('export', `--out=${path.join(temp, 'backup.json')}`);
  ok(exp.counts.participants === 13 && fs.existsSync(exp.file), 'Export writes every record');

  // Drafts: written to drafts/, never sent, no em dashes
  for (const args of [['weekly-review'], ['draft-reminder', '301-003'], ['draft-progress-report', 'MER-301']]) {
    const d = await run(...args);
    const text = fs.readFileSync(d.file, 'utf8');
    ok(d.sent === false && /draft only/i.test(text), `Draft ${args[0]} written, not sent`);
    ok(!text.includes('\u2014'), `Draft ${args[0]} has no em dash`);
  }
  const kesInv = await run('invoice', 'KES-210');
  const chaser = await run('draft-chaser', kesInv.invoice);
  ok(chaser.sent === false && fs.readFileSync(chaser.file, 'utf8').includes(kesInv.invoice), 'Payment chaser drafted for an open invoice');
  await fail(['draft-chaser', 'MER301-0007'], /was paid/);

  // Human output renders every shape
  ok(human(await run('attention')).includes('VISIT DUE'), 'Human tables render');

  // Documents and views render from the same database
  await db.close();
  const env = { ...process.env };
  for (const [script, expect] of [['docs.mjs', /document\(s\) rendered/], ['view.mjs', /view: /]]) {
    const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', script)], { cwd: temp, env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    ok(expect.test(r.stdout), `${script} renders`);
  }
  const out = (spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'docs.mjs'), 'invoice'], { cwd: temp, env, encoding: 'utf8' })).stdout;
  ok(/docs-out/.test(out), 'Invoices render as branded documents');

  console.log(`\nPASS: ${checks} checks`);
} finally {
  try { await db.close(); } catch {}
  if (control) { await control.query(`drop schema ${schema} cascade`); await control.end(); }
  fs.rmSync(temp, { recursive: true, force: true });
}
