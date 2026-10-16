---
description: "Money the site has earned and not invoiced, and invoices not yet paid."
---

# /receivables

Total by study and currency first, then the items. Offer /invoice for any study with earned money older than 30 days.

```bash
node scripts/trial.mjs receivables
```

Use the configured database. Add `--json` when structured output helps. If a name is ambiguous, list the candidates and ask. Never guess a record and never send a message.
