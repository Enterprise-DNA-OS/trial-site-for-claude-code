---
description: "Write the Monday site review from attention, enrolment and record checks."
---

# /weekly-review

The CLI runs all three reads and saves a review in drafts/. Read it and give the site manager their three priorities for the week.

```bash
node scripts/trial.mjs weekly-review
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
