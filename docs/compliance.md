# Record checks

`/compliance` (or `npm run trial -- compliance`) runs the checks below against the records. Each check is a branch of the `v_compliance` view in `supabase/migrations/0001_trial_site.sql`. A finding means the recorded evidence has a gap. It is not legal or regulatory advice, and no findings means only that these checks found none. Your protocol, your clinical trial agreement and your SOPs can be stricter than any rule here: where they are, change the setting or ask `/customise`.

The settings the checks read live in one row of the `settings` table: `sae_report_hours` (24), `gcp_refresh_years` (3), `progress_report_months` (12), `retention_years` (15), `invoice_after_days` (30). Change one with plain SQL or ask Claude Code.

This system is the site's operational record (schedule, money, binder, delegation, safety clocks). It is not eSource or an EDC, and it does not replace the sponsor's safety reporting form.

## SAE-24H

- **Rule:** the investigator reports every serious adverse event to the sponsor immediately, within 24 hours of becoming aware of it, as the protocol sets out.
- **Source:** NHMRC, *Safety monitoring and reporting in clinical trials involving therapeutic goods* (2016), investigator reporting, https://www.nhmrc.gov.au/about-us/publications/safety-monitoring-and-reporting-clinical-trials-involving-therapeutic-goods. In New Zealand and elsewhere, follow the timeline in your protocol.
- **In the data:** an `adverse_events` row with `serious = true` where `reported_at` is empty more than `sae_report_hours` after `aware_at`, or was filled in later than that. The clock runs from when the site became aware (`aware_at`), not from onset. Reported at 23 hours is on time; 25 hours unreported is a finding.

## GCP-NOT-DELEGATED

- **Rule:** the investigator may delegate trial activities only to people qualified by education, training and experience, supervises them, and keeps a record of who was delegated what.
- **Source:** ICH E6(R3) Guideline for Good Clinical Practice, Annex 1, section 2.3, adopted by the TGA, https://www.tga.gov.au/resources/resources/international-scientific-guidelines-adopted-australia/ich-e6r3-guideline-good-clinical-practice.
- **In the data:** a completed visit whose `performed_by` has no `delegations` row on that study listing `visits` in its tasks, with `start_on` on or before the visit date and no `end_on` before it.

## GCP-TRAINING

- **Rule:** delegated staff are qualified and trained for their tasks. How often GCP training is refreshed is set by your SOP and the sponsor, not by the guideline.
- **Source:** ICH E6(R3) Annex 1, sections 2.1 and 2.3 (link above). The interval is your setting, `gcp_refresh_years`.
- **In the data:** a current delegation on an open study for someone whose `staff.gcp_trained_on` is empty or older than the interval.

## CONSENT-BEFORE-VISIT

- **Rule:** freely given informed consent is obtained and documented before the participant takes part in any trial procedure.
- **Source:** ICH E6(R3) Annex 1, section 2.8 (link above).
- **In the data:** a completed visit dated before the participant's `consented_on`, or with no consent date at all. Screening counts.

## CONSENT-VERSION

- **Rule:** when the participant information and consent form is revised and approved, participants still in the study are told and re-consented as the ethics committee directs.
- **Source:** ICH E6(R3) Annex 1, section 2.8 (link above).
- **In the data:** a participant in screening or enrolled whose `consent_version` differs from the study's current approved `consent_version`. Record the re-consent with `/consent`. If the committee decided existing participants do not re-consent, note it and set their version.

## ETHICS-PROGRESS-REPORT

- **Rule:** researchers report on the progress of approved research to the reviewing body at least annually.
- **Source:** NHMRC, *National Statement on Ethical Conduct in Human Research* (2023), paragraph 5.5.5, https://www.nhmrc.gov.au/about-us/publications/national-statement-ethical-conduct-human-research-2023. Many committees set a fixed due date or ask for six-monthly reports on clinical trials: set `progress_report_months` to match.
- **In the data:** an open study whose later of `ethics_approved_on` and `last_progress_report_on` is more than `progress_report_months` ago. `/draft-progress-report` drafts the figures; record the submission with `update studies <protocol> --last_progress_report_on=YYYY-MM-DD`.

## BINDER-EXPIRED

- **Rule:** your site SOP. Essential documents (insurance certificates, registrations, GCP certificates, approvals with an end date) stay current while a study is active.
- **Source:** your SOP. This rule starts with no external citation on purpose.
- **In the data:** a `binder` row with `expires_on` in the past, on a study that is not closed (or site-wide), with no newer row of the same kind for the same study and person. Add the renewed document and the finding clears.

## PROTOCOL-WINDOW

- **Rule:** visits happen inside the windows in the protocol's schedule of assessments, and departures from the protocol are documented.
- **Source:** the study protocol; ICH E6(R3) Annex 1, section 2.5 (link above) on compliance with the protocol.
- **In the data:** a completed visit outside `baseline_on + day - window_before` to `baseline_on + day + window_after`, with no `deviations` row for that visit. The last day of the window is inside. Record the deviation with `/deviation` and the finding clears.

## RETENTION-15Y

- **Rule:** clinical trial records are retained for at least 15 years after the trial ends. Longer periods apply to some trials (for example research with children, or genetic research) and under state, territory and New Zealand law.
- **Source:** TGA notes on ICH E6(R3) citing the *Australian Code for the Responsible Conduct of Research*, https://www.tga.gov.au/resources/resources/international-scientific-guidelines-adopted-australia/ich-e6r3-guideline-good-clinical-practice. Never destroy records without the sponsor's written agreement.
- **In the data:** a closed study with no `archive_until`, or one less than `retention_years` after `closed_on`.
