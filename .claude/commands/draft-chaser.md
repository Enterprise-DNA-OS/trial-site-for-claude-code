---
description: "Draft a payment follow-up to a sponsor for an unpaid invoice."
---

# /draft-chaser

Read /receivables first. Drafts only.

```bash
node scripts/trial.mjs draft-chaser "<invoice number>"
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
