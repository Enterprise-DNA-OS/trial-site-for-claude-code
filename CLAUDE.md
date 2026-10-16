# Trial Site for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR SITE] (an independent clinical research site or site network)
- **Operator:** [YOUR NAME], [site manager, study coordinator, finance or principal investigator]
- **What matters most:** [for example: no safety clock missed, every visit in its window, every completed visit invoiced]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| Every study at the site: sponsor, status, enrolled against target, consent version. | `/studies` |
| One study in full: schedule of assessments, every participant and their next visit, money owed, open record checks. | `/study` |
| Every participant with status, consent version, baseline date and coordinator. | `/participants` |
| One participant's full history: visits and windows, adverse events, deviations and notes. | `/participant` |
| Visits overdue, in their window now, or opening in the next 14 days. | `/schedule` |
| Enrol a participant: set the baseline date and lay out every visit from the schedule of assessments. | `/enrol` |
| Record a consent or re-consent: the version signed and the date. | `/consent` |
| Record a screen failure with the criterion and any screen failure fee the contract pays. | `/screen-fail` |
| Mark a visit done, who performed it and when. Records the sponsor fee it earned and shows any record check it trips. | `/complete-visit` |
| Record a missed visit and the deviation that goes with it. | `/missed-visit` |
| Enrolment against target and the pace needed to hit it by the enrolment close date. | `/enrolment` |
| Every adverse event with when the site became aware, when the sponsor was told, and the hours between. | `/safety` |
| Log a serious adverse event the moment the site hears of it. Starts the sponsor reporting clock. | `/sae` |
| Record when the sponsor was told about an adverse event. | `/sae-reported` |
| Record a protocol deviation against a participant, optionally tied to a visit. | `/deviation` |
| The delegation log: who is delegated which tasks on which study, from when, with their GCP training date. | `/delegation` |
| The regulatory binder: approvals, consent versions, insurance, registrations, GCP certificates, with what has expired or expires within 30 days. | `/binder` |
| Money the site has earned and not invoiced, and invoices not yet paid. | `/receivables` |
| Raise one invoice to the sponsor for everything earned and not yet invoiced on a study. Creates the record; nothing is sent. | `/invoice` |
| Record that a sponsor paid an invoice. | `/paid` |
| Everything that needs someone today: safety clocks, visits overdue or due, unpaid and uninvoiced money, expiring documents, enrolment behind pace. | `/attention` |
| Check the records against the rules in docs/compliance.md and report each gap with its source. | `/compliance` |
| Answer one or all of the ten questions across the records. | `/insights` |
| Add a record: sponsor, staff, study, visit template, delegation, participant, binder document, charge, deviation or note. | `/add` |
| Change fields on an existing record. | `/update` |
| Record a note against a study, optionally a participant. | `/log` |
| Write the Monday site review from attention, enrolment and record checks. | `/weekly-review` |
| Draft a visit reminder to a participant for their next visit window. | `/draft-reminder` |
| Draft a payment follow-up to a sponsor for an unpaid invoice. | `/draft-chaser` |
| Draft the annual progress report figures for the ethics committee. | `/draft-progress-report` |
| Bring subjects and visits across from CRIO report exports. | `/import` |
| Export the whole database to a JSON backup. | `/export` |
| Render sponsor invoices, participant visit schedules, delegation logs, progress report packs and adverse event summaries as branded HTML. | `/documents` |
| Render the read-only dashboards: the week, money, and record checks. | `/view` |
| Change a field, stage name or rule in plain language: migration, test and docs together. | `/customise` |
| Add a read-only dashboard page from a plain-language description. | `/new-view` |

If an ask fits nothing here, run the CLI directly (`npm run trial -- help`) and then propose a new command for it.

## Hard rules

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.
- A serious adverse event not yet reported to the sponsor leads every answer about the site until it is reported.
- Record times as the operator states them. `aware_at` is when the site became aware, not when the event happened.
- Never record a consent, visit, signature, report or payment the operator did not state. A recorded date is evidence, not an approval.
- This is the site's operational record, not eSource or the EDC. Never present it as the source document for a trial.
- Before drafting to a participant, read `/participant`. Use initials and subject numbers, never full names, in anything that leaves the site.
- Read `docs/compliance.md` before explaining a finding. Never say the site is compliant; say what the checks found.
- Money: `--fee`, `--amount` and import columns are dollars. Fields ending `_cents` are cents.
- Schema change: back up with `export`, write a new numbered migration, run `npm run migrate` and `npm test`.
- Plain words, no em dashes.

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the thesis and the guide for moving off CRIO.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/crio
