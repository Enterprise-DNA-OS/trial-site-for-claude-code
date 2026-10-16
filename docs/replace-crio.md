# Moving from CRIO

This guide brings your subjects and visits across from CRIO into Trial Site for Claude Code, study by study. Do a dry run first, check the counts, then import.

## What CRIO gives you to export

CRIO says it offers a suite of standard reports, a report builder inside the platform, a custom report service, and direct data access for your own reporting tools ([eSource product page](https://clinicalresearch.io/products/esource), checked 16 October 2026). It does not publish its report column names, so this guide works from the columns a site report usually carries. Ask your CRIO administrator or CRIO support which standard report gives one row per subject and one row per visit for a study, and download each as CSV (or open it in Excel and save as CSV).

## Before you import

1. Add your sponsors and staff (`/add`), using the same staff names CRIO shows. Unknown names are added as staff with role `other` for you to fix.
2. Add each study (`/add studies --protocol=... --sponsor_id=...`) and its schedule of assessments (`/add visit_templates`): code, name, target day from baseline, the window either side, and the sponsor fee per visit from your clinical trial agreement budget. Visits match the schedule by code or name, case-insensitive.

## Subjects

```bash
npm run trial -- import crio --kind=subjects --study=MER-301 --file=subjects.csv --dry-run
npm run trial -- import crio --kind=subjects --study=MER-301 --file=subjects.csv
```

| What it means | Column names read (first match wins) | Goes to |
|---|---|---|
| Subject number | Subject ID, Subject Number, Subject, Patient ID, Screening Number, Subject # | `participants.subject_number` (required, the match key) |
| Initials | Initials, Subject Initials, Patient Initials | `initials` |
| Status | Subject Status, Status, Patient Status | `status` (see below) |
| Consent date | Consent Date, Informed Consent Date, ICF Date, Date Consented, ICF Signed Date | `consented_on` |
| Consent version | ICF Version, Consent Version, Consent Form Version | `consent_version` |
| Baseline | Randomization Date, Randomisation Date, Enrollment Date, Enrolment Date, Baseline Date, Day 1, Day 1 Date | `baseline_on` (the visit windows count from here) |
| End date | End Date, Withdrawal Date, Screen Fail Date, Completion Date, Discontinuation Date | `ended_on` |
| End reason | Screen Fail Reason, Withdrawal Reason, Discontinuation Reason, End Reason | `end_reason` |
| Referral source | Referral Source, Recruitment Source, Lead Source, Source | `referral_source` |
| Coordinator | Coordinator, Primary Coordinator, Study Coordinator, CRC | `coordinator_id` |
| Phone | Phone, Mobile, Phone Number | `phone` |

Statuses map as: Prescreening, Pre-screen, Lead to `prescreen`; Screening to `screening`; Enrolled, Randomized, Active, On Treatment, Follow Up to `enrolled`; Screen Fail, Screen Failed to `screen-failed`; Completed to `completed`; Withdrawn, Discontinued, Early Termination, Lost to Follow-up to `withdrawn`. Any other status stops the import with the row number: add it to `SUBJECT_STATUS` in `scripts/trial.mjs`, or ask `/customise`.

Dates read as YYYY-MM-DD, DD/MM/YYYY or DD-Mon-YYYY. A US-format export (MM/DD/YYYY) must be converted first; the import treats the first number as the day.

## Visits

```bash
npm run trial -- import crio --kind=visits --study=MER-301 --file=visits.csv --dry-run
npm run trial -- import crio --kind=visits --study=MER-301 --file=visits.csv
```

| What it means | Column names read | Goes to |
|---|---|---|
| Subject number | as above | matched to an imported participant |
| Visit | Visit Name, Visit, Visit Type | matched to the schedule by code or name |
| Visit date | Visit Date, Completed Date, Date of Visit, Actual Date | `completed_on` |
| Scheduled date | Scheduled Date, Appointment Date, Target Date | `scheduled_on` |
| Status | Visit Status, Appointment Status, Status | Completed, Scheduled, Missed, Cancelled (a date with no status means completed) |
| Who did it | Performed By, Investigator, Staff, Completed By, Coordinator | `performed_by` |

A visit that matches nothing in the schedule comes in as an unscheduled visit with no window and no fee. A completed scheduled visit earns its schedule fee as a charge, unless the subject screen-failed. Re-running the import updates visits; it never duplicates them or their charges.

## What does not come across

- eSource forms, source documents and the case report data. They stay in CRIO or the sponsor's EDC, and your archiving obligations for them do not change.
- The regulatory binder files. Add each document's kind, version, approval and expiry with `/add binder`; keep the files where they are and record the location.
- Audit trails and electronic signatures.
- Invoices and payments already raised in CRIO. Add open invoices by hand, or ask Enterprise DNA to map your finance report.
- Adverse events and deviations. Add open ones with `/sae` and `/deviation`.

## After the import

Run `/compliance` and `/attention`. Expect findings the old system never surfaced: a consent dated after a screening visit, a visit outside its window with no deviation, staff delegated with an old GCP date. Each finding says which record and which rule.
