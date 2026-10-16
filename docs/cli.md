# CLI reference

Every slash command drives `scripts/trial.mjs`. Run it directly with `npm run trial -- <command>` or `node scripts/trial.mjs <command>`.

```
note: Reads accept --study=<protocol> and --json. Money flags (--fee, --amount) are dollars; *_cents fields are cents. Reference fields accept names or ids. Drafts go to drafts/ and are never sent.

commands:
  studies
  sponsors
  staff
  participants
  schedule
  enrolment
  receivables
  invoices
  binder
  delegation
  safety
  deviations
  compliance
  attention
  study <protocol>
  participant <subject>
  insights [1..10]
  show <kind> <name|id>
  add <kind> --field=value
  update <kind> <name|id> --field=value
  enrol <subject> --baseline=YYYY-MM-DD
  consent <subject> --version=v3.0 [--on=date]
  screen-fail <subject> --reason=... [--fee=dollars]
  complete <subject> <visit> --by=<staff> [--on=date]
  miss <subject> <visit> [--reason=...]
  sae <subject> "<description>" [--aware-at="YYYY-MM-DD HH:MM"] [--not-serious]
  sae-reported <event> [--at="YYYY-MM-DD HH:MM"]
  deviation <subject> "<description>" [--visit=V3] [--on=date]
  invoice <protocol> [--on=date]
  paid <invoice> [--on=date]
  log <protocol> <note> [--participant=...]
  import crio --kind=subjects|visits --study=<protocol> --file=report.csv [--dry-run]
  export --out=backup.json
  weekly-review
  draft-reminder <subject>
  draft-chaser <invoice>
  draft-progress-report <protocol>
```

## Conventions

- Reads take `--study=<protocol>` and `--json`.
- Names match without case; an id prefix or a fragment of the name works when it is unique. An ambiguous name lists the candidates and exits 1.
- A visit is named by its participant and its code or name: `complete 301-002 V3`, `miss 210-003 "day 90"`.
- Dates are `YYYY-MM-DD` (imports also read `DD/MM/YYYY` and `DD-Mon-YYYY`). Times are `YYYY-MM-DD HH:MM`, stored with their zone.
- Money flags (`--fee`, `--amount`) are dollars. Fields ending `_cents` are cents.
- Drafts are written to `drafts/` and never sent. `invoice` creates the invoice record; sending it is a person's job.

## Settings

The record checks read one row in `settings`: `site_name`, `sae_report_hours`, `gcp_refresh_years`, `progress_report_months`, `retention_years`, `invoice_after_days`. Change them with plain SQL or ask Claude Code; `docs/compliance.md` says what each one drives.
