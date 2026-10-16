# Why there is no front end

Under CRIO's site tools sits an ordinary set of records: studies, participants, visits on a schedule, money earned per visit, documents with expiry dates, people with delegated tasks. What a site pays for is the layer on top that lets coordinators and finance staff get at those records without writing queries.

That layer used to be the whole product, because talking to a database was hard. It is not hard any more. Open this folder in Claude Code, ask "which visits close this week?" or "what have we earned on MER-301 and not invoiced?", and it runs the query and explains the answer. Ask a question the dashboard never had a report for and you still get an answer.

## What you gain

- **Better answers.** Which sponsor pays slowest, which referral source converts, whose visits run out of window. Your own question, against your own records.
- **No seats.** Coordinators, nurses, investigators and finance can all look. The bill does not grow with headcount.
- **Your records in your Postgres.** Plain tables. Back them up, query them from anything, leave any time.
- **Your SOPs, not the vendor's.** Your GCP refresher interval, your invoice timing, your binder rules. Change a setting or ask `/customise`.

## What you give up

- **Bedside data capture.** This is the site's business system, not eSource or an EDC. Source data and case report forms stay where the sponsor and your SOPs put them.
- **A participant-facing app.** No eConsent screens, text reminders or stipend cards. Reminders are drafted for a person to send.
- **Validation paperwork from a vendor.** Systems that hold source data or electronic signatures need validation under your quality system. This one keeps operational records; if you extend it into source data, validate it.
- **A vendor help desk.** This is open source. Enterprise DNA supports the installed version for sites that want someone to call.

## Who this fits

Sites that keep source in the sponsor's EDC or on paper and want the operational side (schedule, money, binder, delegation, safety clocks) in records they own. If your coordinators capture source at the bedside in CRIO every day, keep that part and move the rest.

Installed and run for you: https://enterprisedna.co/omni/instead-of/crio
