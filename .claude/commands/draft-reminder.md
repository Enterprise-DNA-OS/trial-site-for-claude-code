---
description: "Draft a visit reminder to a participant for their next visit window."
---

# /draft-reminder

Read /participant first. Drafts only; the site sends with its approved wording.

```bash
node scripts/trial.mjs draft-reminder "<subject>"
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
