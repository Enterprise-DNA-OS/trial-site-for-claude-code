<h1 align="center">Trial Site for Claude Code</h1>

<p align="center">
  <strong>The open-source clinical trial site system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your CRIO data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=crio">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/crio?utm_source=github&utm_medium=readme&utm_campaign=crio">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-crio">Instead of CRIO</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Trial Site for Claude Code does the job you pay CRIO for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the CRIO dashboard cannot.

CRIO does not publish a price: its site page offers a demo, not a price list ([clinicalresearch.io/solutions/sites](https://clinicalresearch.io/solutions/sites/), checked 16 October 2026). It sells eSource, site CTMS, eRegulatory, payments, recruitment and eConsent as one platform. For a sense of the market, SimpleTrials publishes its site plan at $599 a month plus a startup fee (the page shows a $ sign without naming the currency) ([pricing](https://www.simpletrials.com/pricing), checked 16 October 2026). Here there is no licence fee: the database is yours.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=crio).

It covers the business side of running clinical trials at a site: studies and their schedule of assessments, participants from prescreen to completion, every visit and its protocol window, sponsor money earned per visit and invoiced, the regulatory binder with expiry dates, the delegation log, consent versions, deviations, and the 24-hour serious adverse event clock. It is for the site manager, study coordinators and finance at an independent research site or site network running a handful to a few dozen studies.

What it is not: eSource or an EDC. Source data and case report forms stay where the sponsor and your SOPs put them. There is no participant app, no eConsent and no stipend cards; see [docs/why-no-front-end.md](docs/why-no-front-end.md).

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No per-site quote, no modules billed separately. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/trial-site-for-claude-code.git
cd trial-site-for-claude-code
npm install
npm run demo
```

`npm run demo` loads a fictional research site with four studies into `.data/demo` and prints what needs attention, enrolment and the record checks. Then open the folder in Claude Code and type `/attention`, or ask "which visits close this week?".

```bash
npm test                                   # 90+ checks on a throwaway database
DATA_DIR=.data/demo npm run trial -- study MER-301
DATA_DIR=.data/demo npm run trial -- insights 2
DATA_DIR=.data/demo npm run view           # views/week.html, money.html, compliance.html
DATA_DIR=.data/demo npm run docs           # docs-out/: invoices, visit schedules, delegation logs, progress reports, SAE summaries
```

For real records, use a fresh database and run `npm run migrate` without seeding. Add your sponsors, staff, studies and each study's schedule of assessments, then import your CRIO history.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/studies` | Every study at the site: sponsor, status, enrolled against target, consent version. |
| `/study` | One study in full: schedule of assessments, every participant and their next visit, money owed, open record checks. |
| `/participants` | Every participant with status, consent version, baseline date and coordinator. |
| `/participant` | One participant's full history: visits and windows, adverse events, deviations and notes. |
| `/schedule` | Visits overdue, in their window now, or opening in the next 14 days. |
| `/enrol` | Enrol a participant: set the baseline date and lay out every visit from the schedule of assessments. |
| `/consent` | Record a consent or re-consent: the version signed and the date. |
| `/screen-fail` | Record a screen failure with the criterion and any screen failure fee the contract pays. |
| `/complete-visit` | Mark a visit done, who performed it and when. Records the sponsor fee it earned and shows any record check it trips. |
| `/missed-visit` | Record a missed visit and the deviation that goes with it. |
| `/enrolment` | Enrolment against target and the pace needed to hit it by the enrolment close date. |
| `/safety` | Every adverse event with when the site became aware, when the sponsor was told, and the hours between. |
| `/sae` | Log a serious adverse event the moment the site hears of it. Starts the sponsor reporting clock. |
| `/sae-reported` | Record when the sponsor was told about an adverse event. |
| `/deviation` | Record a protocol deviation against a participant, optionally tied to a visit. |
| `/delegation` | The delegation log: who is delegated which tasks on which study, from when, with their GCP training date. |
| `/binder` | The regulatory binder: approvals, consent versions, insurance, registrations, GCP certificates, with what has expired or expires within 30 days. |
| `/receivables` | Money the site has earned and not invoiced, and invoices not yet paid. |
| `/invoice` | Raise one invoice to the sponsor for everything earned and not yet invoiced on a study. Creates the record; nothing is sent. |
| `/paid` | Record that a sponsor paid an invoice. |
| `/attention` | Everything that needs someone today: safety clocks, visits overdue or due, unpaid and uninvoiced money, expiring documents, enrolment behind pace. |
| `/compliance` | Check the records against the rules in docs/compliance.md and report each gap with its source. |
| `/insights` | Answer one or all of the ten questions across the records. |
| `/add` | Add a record: sponsor, staff, study, visit template, delegation, participant, binder document, charge, deviation or note. |
| `/update` | Change fields on an existing record. |
| `/log` | Record a note against a study, optionally a participant. |
| `/weekly-review` | Write the Monday site review from attention, enrolment and record checks. |
| `/draft-reminder` | Draft a visit reminder to a participant for their next visit window. |
| `/draft-chaser` | Draft a payment follow-up to a sponsor for an unpaid invoice. |
| `/draft-progress-report` | Draft the annual progress report figures for the ethics committee. |
| `/import` | Bring subjects and visits across from CRIO report exports. |
| `/export` | Export the whole database to a JSON backup. |
| `/documents` | Render sponsor invoices, participant visit schedules, delegation logs, progress report packs and adverse event summaries as branded HTML. |
| `/view` | Render the read-only dashboards: the week, money, and record checks. |
| `/customise` | Change a field, stage name or rule in plain language: migration, test and docs together. |
| `/new-view` | Add a read-only dashboard page from a plain-language description. |

The full CLI reference is [docs/cli.md](docs/cli.md). Every read takes `--json` and `--study=<protocol>`. Names match without case, partial ids work, and an ambiguous name lists the candidates and exits 1. Drafts go to `drafts/` and are never sent.

## Ten questions to ask across your own records

These run today with `npm run trial -- insights`:

1. Which sponsors pay us slowest, against their own payment terms?
2. How much have we earned and not yet invoiced, by study and age?
3. Which studies are behind their enrolment pace?
4. Which referral sources bring participants who actually enrol?
5. Who has run the most visits outside the protocol window?
6. What is each study's screen failure rate, and which screen failures have no fee recorded?
7. Which participants have a visit due in the next 14 days and have missed or run late before?
8. Which studies have the most protocol deviations per enrolled participant, counting late visits nobody recorded?
9. Which coordinators carry the most visit windows in the next 30 days?
10. How much has each study earned per enrolled participant against the full schedule value?

## Record checks

`/compliance` checks the records against these rules. Each rule, its source and its limits are in [docs/compliance.md](docs/compliance.md). The intervals are settings, so your SOP wins.

| Rule | What it flags |
|---|---|
| `SAE-24H` | A serious adverse event not reported to the sponsor within 24 hours of the site becoming aware (NHMRC 2016 guidance) |
| `GCP-NOT-DELEGATED` | A visit performed by someone with no delegation for visits on that study on that date (ICH E6(R3)) |
| `GCP-TRAINING` | Delegated staff with no GCP training date, or one older than your refresher interval |
| `CONSENT-BEFORE-VISIT` | A visit, screening included, before the participant's consent was signed |
| `CONSENT-VERSION` | An active participant who has not signed the current approved consent form |
| `ETHICS-PROGRESS-REPORT` | An open study with no progress report to the ethics committee in 12 months (National Statement 5.5.5) |
| `BINDER-EXPIRED` | An expired insurance certificate, registration or certificate with no renewal on file |
| `PROTOCOL-WINDOW` | A visit outside its protocol window with no deviation recorded |
| `RETENTION-15Y` | A closed study archived for less than 15 years |

## Documents and views

`npm run docs` renders, in your brand from `brand.json`: sponsor invoices, each participant's visit schedule, the delegation log for each study, annual progress report figures for the ethics committee, and a site record of each serious adverse event. `npm run view` renders three read-only dashboards: the week, sponsor money, and record checks. Print them or open them in a browser.

## Your first hour: ten things to ask for

1. "Add our site name and our sponsors: Meridian pays in 45 days, in AUD."
2. "Add our staff with their GCP training dates."
3. "Add study MER-301 and its schedule of assessments: screening, day 1, then weeks 4, 8 and 12 with plus or minus 3 days."
4. "Import our CRIO subject report for MER-301." (dry run first)
5. "Import the visit report too."
6. "What needs someone today?"
7. "What have we earned on MER-301 and not invoiced?" then "raise the invoice".
8. "Which visits close this week, and who is running them?"
9. "Draft the progress report figures for the ethics committee."
10. "Our SOP says GCP refresher every two years, and add a pharmacy log number to every visit." (that is `/customise`)

## Instead of CRIO

CRIO says it offers a suite of standard reports, a report builder inside the platform, and direct data access for your own reporting tools ([eSource](https://clinicalresearch.io/products/esource), checked 16 October 2026). Build or run one report with a row per subject and one with a row per visit, download each as CSV, and import them study by study:

```bash
npm run trial -- import crio --kind=subjects --study=MER-301 --file=subjects.csv --dry-run
npm run trial -- import crio --kind=subjects --study=MER-301 --file=subjects.csv
npm run trial -- import crio --kind=visits   --study=MER-301 --file=visits.csv
```

Add the study and its schedule of assessments first: visits match the schedule by code or name, and anything that does not match comes in as an unscheduled visit. The import upserts on the subject ID, so you can run it again. Completed visits earn their schedule fee, so the money owed starts right. Source documents, eSource forms, regulatory binder files, audit trails and payment history do not come across in this version. Read [docs/replace-crio.md](docs/replace-crio.md) for the column names and what maps where. Fictional examples are in `examples/crio/`.

## Architecture

```
trial-site-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data: one fictional site, four studies, late visits, unpaid invoices, a running SAE clock
  views.json                read-only dashboards (npm run view)
  documents.json            invoices, visit schedules, delegation logs, progress reports (npm run docs)
  examples/crio/            fictional CRIO report exports for the import
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Trial Site for Claude Code for your business, migrates your CRIO data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=crio)
- Read more: [enterprisedna.co/omni/instead-of/crio](https://enterprisedna.co/omni/instead-of/crio?utm_source=github&utm_medium=readme&utm_campaign=crio)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
