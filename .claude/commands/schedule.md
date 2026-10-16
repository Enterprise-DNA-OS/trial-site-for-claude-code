---
description: "Visits overdue, in their window now, or opening in the next 14 days."
---

# /schedule

Show the schedule. Overdue first, then window open, then upcoming. Offer a reminder draft for each overdue one.

```bash
node scripts/trial.mjs schedule
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
